"use client";

import React, { useState, useEffect } from 'react';
// import Link from 'next/link'; // <-- REMOVED
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels)
import { BottomNav } from '../../../../components/BottomNav'; // <-- FIXED PATH (4 levels)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// --- Types (from File 4/16: ProductOrder model) ---
interface IThriftOrder {
  _id: string;
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

// --- Helper: Order Card ---
const OrderCard: React.FC<{ order: IThriftOrder }> = ({ order }) => {
  const firstItem = order.items[0];
  const itemSummary = order.items.length > 1 
    ? `${firstItem.nameAtPurchase} + ${order.items.length - 1} other(s)`
    : firstItem.nameAtPurchase;

  const getStatusVariant = (status: IThriftOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'delivered':
        return 'default'; // Using 'default' for green-like success
      case 'shipped':
        return 'secondary';
      case 'paid':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'pending':
      default:
        return 'outline';
    }
  };
  
  const statusVariant = getStatusVariant(order.status);
  const statusClassName = statusVariant === 'default' ? 'bg-green-600 text-white' : '';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">Order</CardTitle>
          <p className="text-xs text-gray-500 font-mono">{order._id}</p>
        </div>
        <Badge variant={statusVariant} className={`capitalize ${statusClassName}`}>
          {order.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-gray-800">{itemSummary}</p>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            <span className="text-xs text-gray-500">Total</span>
            <p className="text-xl font-bold text-gray-900">${order.totalAmount.toFixed(2)}</p>
          </div>
          {/* We'll build this tracking page next */}
          <Button asChild>
            <a href={`/profile/thrift/orders/${order._id}`}>
              View Details
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


// --- Main Page Component ---
export default function ThriftOrdersPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [orders, setOrders] = useState<IThriftOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view your orders.");
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 16: GET /api/orders/me
      const url = `${apiBaseUrl.replace('/auth', '')}/orders/me`;

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        // From File 11, data is an array in the `data` field
        setOrders(data.data); 
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [apiBaseUrl, isAuthLoading, token]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your thrift orders...</p>
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
          <h3 className="text-xl font-semibold text-gray-700">No Orders Found</h3>
          <p className="text-gray-500 mt-2">You haven't bought any thrift items yet.</p>
          <Button asChild className="mt-6">
            <a href="/thrift">Start Shopping</a>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {orders.map(order => (
          <OrderCard key={order._id} order={order} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <a href="/profile"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">My Thrift Orders</h1>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}