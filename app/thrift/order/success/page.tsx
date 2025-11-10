"use client";

import React, { useEffect, useState } from 'react';
// import Link from 'next/link'; // <-- REMOVED
// import { useSearchParams } from 'next/navigation'; // <-- REMOVED
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav'; // <-- FIXED PATH

// Helper hook to read the orderId from the URL on the client
function useThriftOrderId() {
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => {
    // window.location.search is only available on the client
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    if (id) {
      setOrderId(id);
    }
  }, []);
  return orderId;
}

export default function ThriftOrderSuccessPage() {
  const orderId = useThriftOrderId();

  return (
    <div className="max-w-2xl mx-auto p-4 pt-12 min-h-screen">
      <Card>
        <CardContent className="flex flex-col items-center text-center p-8 pt-12">
          <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
          <h1 className="text-3xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="text-lg text-gray-600 mt-2">
            Your thrift order has been placed.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mt-4">
              Order ID: <span className="font-medium text-gray-700">{orderId.substring(0, 12)}...</span>
            </p>
          )}

          <div className="flex space-x-4 mt-8">
            <Button asChild>
              <a href="/profile/thrift/orders"> {/* We will build this next */}
                Track Your Order
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/thrift">
                Continue Shopping
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      <BottomNav currentPage="thrift" />
    </div>
  );
}