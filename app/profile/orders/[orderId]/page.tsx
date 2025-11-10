"use client";

import React, { useState, useEffect } from 'react';
// import { useParams } from 'next/navigation'; // <-- REMOVED
// import Link from 'next/link'; // <-- REMOVED
import { useAuth } from '@/lib/AuthContext'; // <-- REVISED: Using correct alias
import { BottomNav } from '@/components/BottomNav'; // <-- REVISED: Using correct alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Package, CookingPot, Utensils, XCircle } from 'lucide-react';
import io, { Socket } from 'socket.io-client';

// --- Types (from File 51: foodOrder.model.js) ---
interface IOrder {
  _id: string;
  restaurant: {
    _id: string;
    name: string;
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

// Helper hook to read the orderId from the URL on the client
function useOrderId() {
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => {
    // window.location.pathname is only available on the client
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments.pop() || pathSegments.pop(); // Get the last segment
    if (id) {
      setOrderId(id);
    }
  }, []);
  return orderId;
}

// --- Helper: Order Status Stepper ---
const OrderStatusStepper: React.FC<{ status: IOrder['status'] }> = ({ status }) => {
  const steps = [
    { name: 'Pending', status: 'pending', icon: Utensils },
    { name: 'Accepted', status: 'accepted', icon: CheckCircle },
    { name: 'Preparing', status: 'preparing', icon: CookingPot },
    { name: 'Ready', status: 'ready', icon: Package },
    { name: 'Delivered', status: 'delivered', icon: CheckCircle },
  ];

  const rejected = status === 'rejected';
  
  if (rejected) {
    return (
      <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center space-x-3">
        <XCircle className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Order Rejected</h3>
          <p className="text-sm">Unfortunately, the restaurant could not fulfill this order. Please contact them for more details.</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(step => step.status === status);

  return (
    <div className="flex justify-between items-start space-x-1 sm:space-x-2">
      {steps.map((step, index) => {
        const isActive = index <= currentStepIndex;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.status}>
            {/* Divider Line (skip for first item) */}
            {index > 0 && (
              <div className={`flex-1 h-1 mt-5 ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
            
            {/* Step Item */}
            <div className="flex flex-col items-center w-16 text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                {step.name}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};


// --- Main Page Component ---
export default function OrderDetailPage() {
  const orderId = useOrderId(); // Use our custom hook
  
  const { token, apiBaseUrl, user, isLoading: isAuthLoading } = useAuth();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !orderId) return; // Wait for auth and orderId

    if (!token) {
      setError("You must be logged in to view this order.");
      setIsLoading(false);
      return;
    }

    // --- 1. Fetch Initial Order Data ---
    const fetchOrder = async () => {
      setIsLoading(true);
      setError(null);
      
      // Fetch from File 12/20: GET /api/restaurants/orders/:id
      const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/${orderId}`;

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        setOrder(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrder();

    // --- 2. Connect to Socket.io (File 30: realtime.js) ---
    const socketUrl = apiBaseUrl.split('/api')[0]; 
    const socket: Socket = io(socketUrl, {
      auth: { userId: user?._id } // Send userId for authentication
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Listen for updates *for this specific order*
      // (From File 12: `emitOrderEvent(order.user.toString(), 'order:status', ...)`
      socket.on('order:status', (updatedOrder: { id: string, status: IOrder['status'] }) => {
        if (updatedOrder.id === orderId) {
          console.log('LIVE UPDATE RECEIVED:', updatedOrder);
          // Update the order status in real-time
          setOrder(prevOrder => {
            if (prevOrder) {
              return { ...prevOrder, status: updatedOrder.status };
            }
            return null;
          });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Cleanup function: Disconnect socket when component unmounts
    return () => {
      socket.off('order:status');
      socket.disconnect();
    };

  }, [token, apiBaseUrl, isAuthLoading, orderId, user?._id]);

  const renderContent = () => {
    if (isLoading || !orderId) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading order details...</p>
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

    if (!order) {
      return <div className="p-12 text-center text-gray-500">Order not found.</div>;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Tracking Order</CardTitle>
          <p className="text-gray-500 text-sm">
            from <span className="font-medium text-gray-800">{order.restaurant.name}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* --- Status Stepper --- */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Status</h3>
            <OrderStatusStepper status={order.status} />
          </div>

          {/* --- Item Summary --- */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Summary</h3>
            <ul className="space-y-3">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">
                    <span className="font-semibold text-gray-900">{item.qty}x</span> {item.name}
                  </span>
                  <span className="text-gray-800">${(item.price * item.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center text-xl font-bold mt-4 pt-4 border-t">
              <span className="text-gray-900">Total</span>
              <span className="text-indigo-600">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          {/* Replaced Link with <a> */}
          <a href="/profile/orders"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}