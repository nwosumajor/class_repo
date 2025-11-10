"use client";

import React, { useState, useEffect } from 'react';
// import Link from 'next/link'; // <-- REMOVED
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { BottomNav } from '@/components/BottomNav'; // <-- Using @/ alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Plus, CreditCard, PieChart, Eye, DollarSign, MousePointerClick, CheckCircle, PauseCircle, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- Types (from Backend Files) ---
interface IAd {
  _id: string;
  title: string;
  status: 'active' | 'paused' | 'expired' | 'draft' | 'completed' | 'rejected';
  budget: number;
  totalSpent: number;
  type: 'featured' | 'sidebar' | 'sponsored';
}

interface IAdListResponse {
  success: boolean;
  data: IAd[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalAds: number;
  };
  message?: string;
}

// --- NEW: Types from File 36 (adPerformance.controller.js) ---
interface IAdInsights {
  totals: {
    impr: number;
    clicks: number;
    conv: number;
    value: number;
    spend: number;
  };
  avgCTR: number;
  avgCVR: number;
  recommendations: string[];
}

interface IInsightsResponse {
  success: boolean;
  data: IAdInsights;
  message?: string;
}

// --- Helper: Ad Status Badge ---
const getStatusBadge = (status: IAd['status']) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1"/>Active</Badge>;
    case 'paused':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><PauseCircle className="h-3 w-3 mr-1"/>Paused</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1"/>Rejected</Badge>;
    case 'expired':
    case 'completed':
      return <Badge variant="outline" className="text-gray-500 border-gray-400">Completed</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

// --- NEW: Helper Stat Card ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
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

// --- Main Page Component ---
export default function MyAdsDashboard() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  
  const [ads, setAds] = useState<IAd[]>([]);
  const [insights, setInsights] = useState<IAdInsights | null>(null); // <-- NEW STATE
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || (user?.role !== 'user' && user?.role !== 'admin')) {
      setError("You must be logged in to view your ads.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      try {
        // --- 1. Fetch Ad List (No Change) ---
        const adsUrl = `${apiRoot}/ads/me/list`;
        const adsRes = await fetch(adsUrl, { headers });
        const adsData: IAdListResponse = await adsRes.json();
        if (!adsData.success) throw new Error(adsData.message || 'Failed to load ads');
        setAds(adsData.data);

        // --- 2. Fetch Insights (NEW) ---
        // From File 44: GET /api/ads/me/insights
        const insightsUrl = `${apiRoot}/ads/me/insights`;
        const insightsRes = await fetch(insightsUrl, { headers });
        const insightsData: IInsightsResponse = await insightsRes.json();
        if (!insightsData.success) throw new Error(insightsData.message || 'Failed to load insights');
        setInsights(insightsData.data);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, isAuthLoading, token, user?.role, apiRoot]);


  const renderStats = () => {
    if (!insights) return null;
    
    return (
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Spend" 
          value={`$${insights.totals.spend.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard 
          title="Total Impressions" 
          value={insights.totals.impr.toLocaleString()}
          icon={Eye}
        />
        <StatCard 
          title="Total Clicks" 
          value={insights.totals.clicks.toLocaleString()}
          icon={MousePointerClick}
        />
        <StatCard 
          title="Avg. CTR" 
          value={`${(insights.avgCTR * 100).toFixed(2)}%`}
          icon={PieChart}
        />
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your ad campaigns...</p>
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
    
    if (ads.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Ads Found</h3>
          <p className="text-gray-500 mt-2">Click "Create New Ad" to get started.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad._id}>
                  <TableCell>
                    <div className="font-medium">{ad.title}</div>
                    <div className="text-xs text-gray-500 capitalize">{ad.type}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(ad.status)}</TableCell>
                  <TableCell>
                    <div className="font-medium">${ad.totalSpent.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">/ ${ad.budget.toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      {/* Using <a> tag to avoid build errors */}
                      <a href={`/profile/ads/${ad._id}`}>
                        <PieChart className="h-4 w-4 mr-2" />
                        Stats
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          {/* Using <a> tag to avoid build errors */}
          <a href="/profile"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Ad Manager</h1>
      </div>

      <div className="flex justify-end mb-6">
        <Button asChild size="lg">
          {/* Using <a> tag to avoid build errors */}
          <a href="/profile/ads/create">
            <Plus className="h-5 w-5 mr-2" /> Create New Ad
          </a>
        </Button>
      </div>
      
      {/* --- NEW: Insights Section --- */}
      {renderStats()}
      
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Ad Campaigns</h2>
      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}