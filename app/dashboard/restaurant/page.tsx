"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, ClipboardList, Utensils, Star, ArrowRight, Building, Clock, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// --- Types ---
// From File 10
interface IAnalytics {
  orders: number;
  revenue: number;
  topItems: { name: string; qty: number; }[];
  menuCount: number;
}
// From File 51
interface IOrder {
  _id: string;
  user: { name: string; };
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'delivered';
  createdAt: string;
}
// From File 5
interface IRestaurant {
  _id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  approvalNotes?: string;
}
// For the create form
type Coords = [number, number]; // [longitude, latitude]

// --- Page State ---
type RestaurantStatus = 'loading' | 'approved' | 'pending' | 'rejected' | 'not_found';

// --- 1. StatCard Component (No Change) ---
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

// --- 2. Approved Dashboard Component (Existing Logic) ---
const ApprovedDashboard: React.FC<{
  analytics: IAnalytics | null;
  orders: IOrder[];
}> = ({ analytics, orders }) => (
  <div className="space-y-8">
    {/* Stat Cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Revenue" value={`$${analytics?.revenue.toFixed(2) || '0.00'}`} icon={DollarSign} />
      <StatCard title="Total Orders" value={`+${analytics?.orders || 0}`} icon={ClipboardList} />
      <StatCard title="Menu Items" value={analytics?.menuCount || 0} icon={Utensils} />
      <StatCard title="Top Item" value={analytics?.topItems[0]?.name || 'N/A'} icon={Star} />
    </div>
    {/* Recent Orders Table */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Incoming Orders</CardTitle>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/restaurant/orders">
            View All <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-8">No recent orders.</TableCell></TableRow>}
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell><div className="font-medium">{order.user.name}</div><div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div></TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{order.status}</Badge></TableCell>
                <TableCell className="text-right font-medium">${order.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

// --- 3. Create Restaurant Form (NEW) ---
const CreateRestaurantForm: React.FC<{ onProfileCreated: (restaurant: IRestaurant) => void }> = ({ onProfileCreated }) => {
  const { token, apiBaseUrl } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lng, setLng] = useState('');
  const [lat, setLat] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const coordinates: Coords = [parseFloat(lng), parseFloat(lat)];
    if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      setError("Latitude and Longitude must be valid numbers.");
      setIsLoading(false);
      return;
    }

    const body = {
      name,
      address,
      contact: { phone, email },
      location: { coordinates }
    };

    // From File 19: POST /api/restaurants/register
    const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to create profile.');

      // Success! Update the parent's state
      onProfileCreated(result.data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Restaurant Profile</CardTitle>
        <CardContent className="text-gray-600 pt-2 px-0">
          Welcome! Please submit your restaurant details. Our admin team will review
          your submission for approval within 24-48 hours.
        </CardContent>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g., 6.5244" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g., 3.3792" required />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Approval'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
};

// --- 4. Pending Approval Message (NEW) ---
const PendingApprovalMessage: React.FC = () => (
  <Card className="max-w-2xl mx-auto text-center">
    <CardHeader>
      <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
      <CardTitle className="text-2xl">Submission Pending</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-600">
        Your restaurant profile has been submitted and is now awaiting admin approval.
        You will get access to your dashboard as soon as you are approved.
      </p>
    </CardContent>
  </Card>
);

// --- 5. Rejected Message (NEW) ---
const RejectedMessage: React.FC<{ notes?: string }> = ({ notes }) => (
  <Card className="max-w-2xl mx-auto text-center">
    <CardHeader>
      <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <CardTitle className="text-2xl">Submission Rejected</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-gray-600">
        Unfortunately, your restaurant submission was rejected by our team.
      </p>
      {notes && (
        <div className="p-3 bg-gray-100 rounded-lg text-left">
          <p className="font-semibold">Admin Notes:</p>
          <p className="text-gray-700 italic">"{notes}"</p>
        </div>
      )}
      <Button variant="outline">Contact Support</Button>
    </CardContent>
  </Card>
);

// --- 6. Main Page Component (UPDATED) ---
export default function RestaurantDashboardPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  
  // Page-level state
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [status, setStatus] = useState<RestaurantStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Dashboard-specific state
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);


  // --- EFFECT 1: Check Restaurant Status ---
  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || user?.role !== 'restaurant') {
      setStatus('loading'); // Not a restaurant, layout will redirect
      return;
    }

    const checkRestaurantStatus = async () => {
      setStatus('loading');
      setError(null);
      
      // From File 19: GET /api/restaurants/me
      const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/me`;
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.status === 404) {
          setStatus('not_found'); // No profile exists
          return;
        }
        
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to check status');
        
        setRestaurant(data.data);
        setStatus(data.data.status); // 'approved', 'pending', 'rejected'
        
      } catch (err: any) {
        setError(err.message);
      }
    };
    checkRestaurantStatus();
  }, [apiBaseUrl, isAuthLoading, token, user?.role]);

  // --- EFFECT 2: Fetch Dashboard Data (Only if approved) ---
  useEffect(() => {
    if (status !== 'approved' || !token) return; // Only run if approved

    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setError(null);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch Analytics (File 10)
        const analyticsUrl = `${apiBaseUrl.replace('/auth', '')}/analytics/owner/summary`;
        const analyticsRes = await fetch(analyticsUrl, { headers });
        const analyticsData = await analyticsRes.json();
        if (!analyticsData.success) throw new Error(analyticsData.message || 'Failed to load analytics');
        setAnalytics(analyticsData);

        // 2. Fetch Orders (File 12/20)
        const ordersUrl = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/restaurant`;
        const ordersRes = await fetch(ordersUrl, { headers });
        const ordersData = await ordersRes.json();
        if (!ordersData.success) throw new Error(ordersData.message || 'Failed to load orders');
        setOrders(ordersData.data.slice(0, 5)); 

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsDashboardLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [status, token, apiBaseUrl]); // Reruns if status changes to 'approved'


  // --- Main Render Logic ---
  const renderContent = () => {
    if (isAuthLoading || status === 'loading') {
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
    
    // Use a switch to show the correct component based on status
    switch (status) {
      case 'not_found':
        return (
          <CreateRestaurantForm 
            onProfileCreated={(newRestaurant) => {
              setRestaurant(newRestaurant);
              setStatus(newRestaurant.status); // This will be 'pending'
            }} 
          />
        );
      case 'pending':
        return <PendingApprovalMessage />;
      case 'rejected':
        return <RejectedMessage notes={restaurant?.approvalNotes} />;
      case 'approved':
        if (isDashboardLoading) {
           return (
            <div className="flex items-center justify-center h-[50vh]">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
          );
        }
        return <ApprovedDashboard analytics={analytics} orders={orders} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {renderContent()}
    </div>
  );
}