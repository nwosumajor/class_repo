"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, ClipboardList, Utensils, Star } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// --- Types (from File 10: analytics.controller.js) ---
interface ITopItem {
  name: string;
  qty: number;
  revenue: number;
}
interface IAnalytics {
  orders: number;
  revenue: number;
  topItems: ITopItem[];
  menuCount: number;
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

// --- Main Page Component ---
export default function RestaurantAnalyticsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setError("You must be logged in to view analytics.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch Analytics (File 10)
        const analyticsUrl = `${apiBaseUrl.replace('/auth', '')}/analytics/owner/summary`;
        const analyticsRes = await fetch(analyticsUrl, { headers });
        const analyticsData = await analyticsRes.json();
        if (!analyticsData.success) throw new Error(analyticsData.message || 'Failed to load analytics');
        setAnalytics(analyticsData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [apiBaseUrl, isAuthLoading, token]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your analytics...</p>
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
    
    if (!analytics) {
       return <div className="p-12 text-center text-gray-500">No analytics data found.</div>;
    }

    return (
      <div className="space-y-8">
        {/* --- Stat Cards --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Revenue" 
            value={`$${analytics.revenue.toFixed(2)}`}
            icon={DollarSign}
          />
          <StatCard 
            title="Total Orders" 
            value={`+${analytics.orders}`}
            icon={ClipboardList}
          />
          <StatCard 
            title="Menu Items" 
            value={analytics.menuCount}
            icon={Utensils}
          />
           <StatCard 
            title="Top Item" 
            value={analytics.topItems[0]?.name || 'N/A'}
            icon={Star}
          />
        </div>

        {/* --- Charts --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Top Items (by Quantity Sold)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topItems} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qty" fill="#4f46e5" name="Quantity Sold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Items (by Revenue)</CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topItems} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="$" />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
      {renderContent()}
    </div>
  );
}