"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/AuthContext'; // <-- FIXED PATH (3 levels up)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Shield, Building, ShoppingBag, Gamepad2, CreditCard } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Types (from File 34: ad.admin.controller.js) ---
interface IAdminMetrics {
  totalRevenue: number;
  topAdvertisers: {
    userId: string;
    spend: number;
    name: string;
    email: string;
  }[];
  flagged: {
    _id: string;
    title: string;
    owner: {
      name: string;
      email: string;
    };
    flaggedCount: number;
    status: string;
  }[];
}

// --- Helper: Stat Card ---
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      <Icon className="h-5 w-5 text-gray-400" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </CardContent>
  </Card>
);

export default function AdminOverviewPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [metrics, setMetrics] = useState<IAdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || user?.role !== 'admin') {
      setError("You must be an admin to view this page.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch Admin Metrics (File 9/34)
        const metricsUrl = `${apiBaseUrl.replace('/auth', '')}/admin/ads/metrics`;
        const metricsRes = await fetch(metricsUrl, { headers });
        const metricsData = await metricsRes.json();
        if (!metricsData.success) throw new Error(metricsData.message || 'Failed to load admin metrics');
        setMetrics(metricsData);

        // In a real app, you might fetch user counts, restaurant counts, etc.
        // For now, we'll just use the ad metrics.

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, isAuthLoading, token, user?.role]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
        {error}
      </div>
    );
  }

  if (!metrics) {
    return <div className="p-12 text-center text-gray-500">No metrics data found.</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
      
      {/* --- Stat Cards --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Ad Revenue" 
          value={`$${metrics.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard 
          title="Flagged Ads" 
          value={metrics.flagged.length}
          icon={Shield}
        />
        <StatCard 
          title="Top Advertiser" 
          value={metrics.topAdvertisers[0]?.name || 'N/A'}
          icon={CreditCard}
        />
        <StatCard 
          title="Top Spend" 
          value={`$${metrics.topAdvertisers[0]?.spend.toFixed(2) || '0'}`}
          icon={CreditCard}
        />
      </div>

      {/* --- Data Tables --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Advertisers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topAdvertisers.map(adUser => (
                  <TableRow key={adUser.userId}>
                    <TableCell>
                      <div className="font-medium">{adUser.name}</div>
                      <div className="text-xs text-gray-500">{adUser.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">${adUser.spend.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagged Ads for Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Title</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.flagged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                      No flagged ads.
                    </TableCell>
                  </TableRow>
                )}
                {metrics.flagged.map(ad => (
                  <TableRow key={ad._id}>
                    <TableCell>
                      <div className="font-medium">{ad.title}</div>
                      <div className="text-xs text-gray-500">{ad.owner.name}</div>
                    </TableCell>
                    <TableCell className="font-bold text-red-600">{ad.flaggedCount}</TableCell>
                    <TableCell><Badge variant="outline">{ad.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}