"use client";

import React, { useState, useEffect } from 'react';
// import Link from 'next/link'; // Replaced with <a> tags
// import { useSearchParams } from 'next/navigation'; // Replaced with custom hook
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { BottomNav } from '../../../components/BottomNav'; // <-- FIXED PATH

// Helper hook to read URL parameters on the client
function useClientIdSearchParams() {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // window.location.search is only available on the client
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get('orderId'));
  }, []);

  return { orderId };
}

export default function OrderSuccessPage() {
  const { orderId } = useClientIdSearchParams();

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 flex flex-col items-center justify-center min-h-screen text-center">
      
      <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
      
      <h1 className="text-4xl font-bold text-gray-900">Payment Successful!</h1>
      
      <p className="text-lg text-gray-600 mt-4">
        Your order has been placed and is now being processed by the restaurant.
      </p>
      
      {orderId && (
        <p className="text-md text-gray-500 mt-2">
          Order ID: <span className="font-mono bg-gray-100 p-1 rounded">{orderId.substring(0, 12)}...</span>
        </p>
      )}

      <div className="flex space-x-4 mt-10">
        <Button variant="outline" asChild>
          {/* Replaced Link with <a> */}
          <a href="/food"> 
            Order More Food
          </a>
        </Button>
        <Button asChild>
          {/* Replaced Link with <a> */}
          <a href="/profile/orders"> {/* We will build this page later */}
            Track Your Order <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>

      <BottomNav currentPage="cart" /> {/* Keep cart highlighted as end of flow */}
    </div>
  );
}