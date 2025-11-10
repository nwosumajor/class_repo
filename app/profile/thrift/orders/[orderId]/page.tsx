"use client";

import React, { useState, useEffect } from 'react';
// import { useParams } from 'next/navigation'; // <-- REMOVED
// import Link from 'next/link'; // <-- REMOVED
import { useAuth } from '../../../../../lib/AuthContext'; // <-- FIXED PATH (5 levels up)
import { BottomNav } from '@/components/BottomNav'; // <-- FIXED PATH (use project alias)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, Package, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  paidAt?: string;
}

// Helper hook to read the orderId from the URL on the client
function useThriftOrderId() {
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

// --- Helper: Status Stepper ---
const StatusStepper: React.FC<{ status: IThriftOrder['status'] }> = ({ status }) => {
  const steps = [
    { name: 'Paid', status: 'paid', icon: ShieldCheck },
    { name: 'Shipped', status: 'shipped', icon: Package },
    { name: 'Delivered', status: 'delivered', icon: CheckCircle },
  ];

  if (status === 'pending') {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg flex items-center space-x-3">
        <Clock className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Pending Payment</h3>
          <p className="text-sm">This order has been created but not yet paid for. Please complete your payment.</p>
        </div>
      </div>
    );
  }
  
  if (status === 'cancelled') {
    return (
      <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center space-x-3">
        <XCircle className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Order Cancelled</h3>
          <p className="text-sm">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(step => step.status === status);

  return (
    <div className="flex justify-between items-start space-x-2">
      {steps.map((step, index) => {
        // Find the index of the *current* status for highlighting
        // If current status is 'paid', index is 0. If 'shipped', 1, etc.
        const isActive = index <= currentStepIndex;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.status}>
            {/* Divider Line (skip for first item) */}
            {index > 0 && (
              <div className={`flex-1 h-1 mt-5 ${isActive ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
            
            {/* Step Item */}
            <div className="flex flex-col items-center w-20 text-center">
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
export default function ThriftOrderDetailPage() {
  const orderId = useThriftOrderId(); // Use our custom hook
  
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [order, setOrder] = useState<IThriftOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || !orderId) return; // Wait for auth and orderId

    if (!token) {
      setError("You must be logged in to view this order.");
      setIsLoading(false);
      return;
    }

    // --- 1. Fetch Order Data ---
    const fetchOrder = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 16: GET /api/orders/:id
      const url = `${apiBaseUrl.replace('/auth', '')}/orders/${orderId}`;

      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        // From File 11, data is in the `data` field
        setOrder(data.data); 
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrder();

    // No Socket.io for thrift orders in our backend files,
    // so we just fetch the data once.

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
          <CardTitle className="text-2xl">Thrift Order Details</CardTitle>
          <p className="text-gray-500 text-sm font-mono">
            {order._id}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* --- Status Stepper --- */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Status</h3>
            <StatusStepper status={order.status} />
          </div>

          {/* --- Item Summary --- */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Order Summary</h3>
            <ul className="space-y-3">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">
                    <span className="font-semibold text-gray-900">{item.quantity}x</span> {item.nameAtPurchase}
                  </span>
                  <span className="text-gray-800">${(item.priceAtPurchase * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center text-xl font-bold mt-4 pt-4 border-t">
              <span className="text-gray-900">Total Paid</span>
              <span className="text-indigo-600">${order.totalAmount.toFixed(2)}</span>
            </div>
            {order.paidAt && (
               <p className="text-sm text-gray-500 text-right">
                Paid on {new Date(order.paidAt).toLocaleDateString()}
              </p>
            )}
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
          <a href="/profile/thrift/orders"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}