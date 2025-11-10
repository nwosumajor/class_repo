"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- REVISED: Using correct alias
import { BottomNav } from '@/components/BottomNav'; // <-- REVISED: Using correct alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ListOrdered } from 'lucide-react';
import Link from 'next/link'; // <-- RE-ADDED: Use Next.js Link

// --- Types (from File 51: foodOrder.model.js) ---
interface IOrder {
  _id: string;
  restaurant: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  items: {
    name: string;
    qty: number;
    price: number;
  }[];
  total: number;
  status: string;
  createdAt: string;
}

// --- Helper: Order Card ---
const OrderCard: React.FC<{ order: IOrder }> = ({ order }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'preparing':
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'accepted':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const itemPreview = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">{order.restaurant.name}</CardTitle>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 truncate" title={itemPreview}>
          {itemPreview}
        </p>
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <span className="text-xl font-bold text-gray-900">${order.total.toFixed(2)}</span>
          <Button asChild variant="default" size="sm">
            {/* Use Next.js Link for optimized navigation */}
            <Link href={`/profile/orders/${order._id}`}>Track Order</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Page Component ---
export default function MyOrdersPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!token) {
      setError("You must be logged in to view your orders.");
      setIsLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/me`;

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch orders.');
        }

        setOrders(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [token, apiBaseUrl, isAuthLoading]);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link href="/profile"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">My Food Orders</h1>
      </div>

      {/* --- Content --- */}
      {isLoading ? (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <Card className="text-center p-12">
          <ListOrdered className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">No Orders Found</h2>
          <p className="text-gray-500 mt-2">You haven't placed any food orders yet.</p>
          <Button asChild className="mt-6">
            <Link href="/food">Find Restaurants</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}

      <BottomNav currentPage="profile" />
    </div>
  );
}