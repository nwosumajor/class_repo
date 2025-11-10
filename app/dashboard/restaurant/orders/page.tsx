"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X, Soup, ClipboardList } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- Types (from File 51: foodOrder.model.js) ---
interface IOrder {
  _id: string;
  user: {
    _id: string;
    name: string;
    // Add other user fields if populated, e.g., email
  };
  items: {
    name: string;
    qty: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'delivered';
  createdAt: string;
}

// --- Helper: Order Status Badge ---
const getStatusBadge = (status: IOrder['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Pending</Badge>;
    case 'accepted':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Accepted</Badge>;
    case 'preparing':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Preparing</Badge>;
    case 'ready':
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 text-white">Delivered</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

// --- Helper: Order Action Button/Select ---
const OrderActions: React.FC<{ 
  order: IOrder; 
  onUpdate: (orderId: string, status: IOrder['status']) => void;
  isLoading: boolean;
}> = ({ order, onUpdate, isLoading }) => {
  
  const handleStatusChange = (newStatus: IOrder['status']) => {
    if (newStatus === order.status) return;
    onUpdate(order._id, newStatus);
  };

  // From File 12: `allowedTransitions`
  switch (order.status) {
    case 'pending':
      return (
        <div className="flex space-x-2">
          {/* Accept Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
                <Check className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Accept this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will confirm the order and change its status to "Accepted".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleStatusChange('accepted')} className="bg-green-600 hover:bg-green-700">
                  Accept Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Reject Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={isLoading}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this order?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the order. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleStatusChange('rejected')} className="bg-red-600 hover:bg-red-700">
                  Reject Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    case 'accepted':
      return (
        <Button size="sm" onClick={() => handleStatusChange('preparing')} disabled={isLoading}>
          <Soup className="h-4 w-4 mr-2" />
          Mark as Preparing
        </Button>
      );
    case 'preparing':
      return (
        <Button size="sm" onClick={() => handleStatusChange('ready')} disabled={isLoading}>
          Mark as Ready
        </Button>
      );
    case 'ready':
       return (
        <Button size="sm" onClick={() => handleStatusChange('delivered')} disabled={isLoading}>
          Mark as Delivered
        </Button>
      );
    case 'delivered':
    case 'rejected':
      return null; // No more actions
    default:
      return null;
  }
};


// --- Main Page Component ---
export default function RestaurantOrdersPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Stores the ID of the order being updated

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 12/20: GET /api/restaurants/orders/restaurant
    const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/restaurant`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      setOrders(data.data); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view orders.");
      return;
    }
    fetchOrders();
  }, [apiBaseUrl, isAuthLoading, token]); // Removed fetchOrders from dependencies

  const handleUpdateStatus = async (orderId: string, status: IOrder['status']) => {
    setIsUpdating(orderId);
    setUpdateError(null);

    // From File 12/20: PUT /api/restaurants/orders/:id/status
    const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/${orderId}/status`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
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
      setUpdateError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading incoming orders...</p>
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
          <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Orders Found</h3>
          <p className="text-gray-500 mt-2">You don't have any orders yet.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          {updateError && (
            <div className="p-4 m-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
              {updateError}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <div className="font-mono text-xs">{order._id.substring(0, 10)}...</div>
                    <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="font-medium">{order.user?.name || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <OrderActions 
                      order={order} 
                      onUpdate={handleUpdateStatus} 
                      isLoading={isUpdating === order._id} 
                    />
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Manage Orders</h1>
      {renderContent()}
    </div>
  );
}