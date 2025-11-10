"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { BottomNav } from '../../../../components/BottomNav'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ShoppingBag, Truck, CheckCircle, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types (from File 4/16: ProductOrder model) ---
interface IThriftOrder {
  _id: string;
  buyer: { // Assuming GET /:id populates the buyer
    _id: string;
    name: string;
    email: string;
  };
  items: {
    nameAtPurchase: string;
    quantity: number;
    priceAtPurchase: number;
    product: string; // productId
  }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  isPaid: boolean;
}

// --- Helper: Order Status Badge ---
const getStatusBadge = (status: IThriftOrder['status']) => {
  switch (status) {
    case 'paid':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Paid</Badge>;
    case 'shipped':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Shipped</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 text-white">Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

// --- Helper: Status Action Select ---
const StatusActionSelect: React.FC<{ 
  order: IThriftOrder; 
  onUpdate: (orderId: string, status: IThriftOrder['status']) => void;
  isLoading: boolean;
}> = ({ order, onUpdate, isLoading }) => {
  
  // From File 11: Sellers can only ship paid orders
  if (order.status !== 'paid' && order.status !== 'shipped') {
    return null; // No action available
  }
  
  const availableActions: IThriftOrder['status'][] = [];
  if (order.status === 'paid') {
    availableActions.push('shipped');
  }
  if (order.status === 'shipped') {
    availableActions.push('delivered');
  }

  return (
    <Select
      value={order.status}
      onValueChange={(newStatus: IThriftOrder['status']) => onUpdate(order._id, newStatus)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Update status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={order.status} disabled>{order.status}</SelectItem>
        {availableActions.map(action => (
          <SelectItem key={action} value={action} className="capitalize">
            Mark as {action}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};


// --- Main Page Component ---
export default function ThriftSellerDashboard() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [orders, setOrders] = useState<IThriftOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // OrderID being updated

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- Fetch Seller's Orders ---
  const fetchSellerOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 16: GET /api/orders/restaurant/me
    // Note: This endpoint name is a bit confusing, but it's for sellers
    const url = `${apiRoot}/orders/restaurant/me`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch orders');
      setOrders(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view your seller dashboard.");
      return;
    }
    fetchSellerOrders();
  }, [apiBaseUrl, isAuthLoading, token]); // Removed fetchSellerOrders from dependencies

  // --- Handle Status Update ---
  const handleUpdateStatus = async (orderId: string, status: IThriftOrder['status']) => {
    setIsUpdating(orderId);
    setError(null);

    // From File 16: POST /api/orders/:id/status
    const url = `${apiRoot}/orders/${orderId}/status`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: status }),
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update status.');
      
      // Update the order in our local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, status: result.data.status } : order
        )
      );
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your sales...</p>
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

    if (orders.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Sales Yet</h3>
          <p className="text-gray-500 mt-2">You haven't sold any items yet.</p>
          <Button asChild className="mt-6">
            <a href="/profile/thrift/new">+ Sell Your First Item</a>
          </Button>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Item(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const itemSummary = order.items.length > 1
                  ? `${order.items[0].nameAtPurchase} + ${order.items.length - 1} other(s)`
                  : order.items[0].nameAtPurchase;
                
                return (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div className="font-mono text-xs">{order._id.substring(0, 10)}...</div>
                      <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell className="font-medium">{itemSummary}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <StatusActionSelect 
                        order={order}
                        onUpdate={handleUpdateStatus}
                        isLoading={isUpdating === order._id}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <a href="/profile"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
      </div>
      
      <div className="flex justify-end mb-6">
        <Button asChild size="lg">
          <a href="/profile/thrift/new">
            <Plus className="h-5 w-5 mr-2" /> Sell Another Item
          </a>
        </Button>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}