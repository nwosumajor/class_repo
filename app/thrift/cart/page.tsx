"use client";

import React, { useState } from 'react';
// import { useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../lib/AuthContext'; // <-- FIXED PATH (3 levels up)
import { useThriftCart, IThriftCartItem } from '../../../lib/ThriftCartContext'; // <-- FIXED PATH (3 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BottomNav } from '../../../components/BottomNav'; // <-- FIXED PATH (3 levels up)
import { Loader2, Plus, Minus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
// import Link from 'next/link'; // <-- REMOVED
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

// Interface for the 'createOrder' API response (File 11)
interface IThriftOrderResponse {
  success: boolean;
  data: {
    _id: string;
    status: string;
    // ... other order fields
  };
  message?: string;
}

/**
 * A single row component for an item in the thrift cart
 */
const ThriftCartItemRow: React.FC<{ item: IThriftCartItem }> = ({ item }) => {
  const { updateItemQty, removeItem } = useThriftCart();
  const imageUrl = item.image || `https://placehold.co/100x100/E9D5FF/3730A3?text=...`;

  return (
    <div className="flex items-center space-x-4 py-4">
      <img 
        src={imageUrl} 
        alt={item.name} 
        className="w-16 h-16 object-cover rounded-lg border"
        onError={(e: any) => e.target.src = 'https://placehold.co/100x100/F3F4F6/9CA3AF?text=N/A'}
      />

      {/* Item Details */}
      <div className="flex-1">
        <h4 className="font-semibold">{item.name}</h4>
        <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 p-0 h-auto mt-1"
          onClick={() => removeItem(item.productId)}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Remove
        </Button>
      </div>

      {/* Quantity Controls & Price */}
      <div className="flex flex-col items-end space-y-2">
        <span className="font-bold text-lg">${(item.price * item.qty).toFixed(2)}</span>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateItemQty(item.productId, item.qty - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-6 text-center font-bold">{item.qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateItemQty(item.productId, item.qty + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Thrift Cart Page Component
 */
export default function ThriftCartPage() {
  const { items, itemCount, cartTotal, clearCart } = useThriftCart();
  const { isAuthenticated, token, apiBaseUrl } = useAuth();
  // const router = useRouter(); // <-- REMOVED

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thrift module doesn't have delivery options in our model
  const total = cartTotal;

  const handleCheckout = async () => {
    if (!isAuthenticated || !token) {
      setError("You must be logged in to place an order.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    // 1. Format items for the backend (File 11, 16)
    const orderItems = items.map(item => ({
      product: item.productId,
      quantity: item.qty,
      priceAtPurchase: item.price, // From File 4/52 model
      nameAtPurchase: item.name,   // From File 4/52 model
    }));

    // 2. Create the order body (File 11 controller)
    const orderBody = {
      items: orderItems,
      totalAmount: total, // From File 4/52 model
    };

    try {
      // 3. Call the 'createOrder' API (File 16 route)
      const response = await fetch(`${apiBaseUrl.replace('/auth', '')}/orders`, { // This is /api/orders
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // <-- Send the auth token
        },
        body: JSON.stringify(orderBody),
      });

      const result: IThriftOrderResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create thrift order.');
      }

      // 4. Order created! Now we need to pay.
      console.log('Thrift Order created:', result.data._id);
      
      // Clear the cart *after* successful order creation
      clearCart();

      // 5. Redirect to a new payment page for thrift
      // We will build this page next
      // router.push(`/thrift/checkout/pay?orderId=${result.data._id}&total=${total}`); // <-- REPLACED
      window.location.href = `/thrift/checkout/pay?orderId=${result.data._id}&total=${total}`; // <-- FIXED

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Thrift Cart</h1>
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" /> Clear Cart
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all items from your thrift cart.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearCart} className="bg-red-600 hover:bg-red-700">
                  Clear Cart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      {/* --- Cart Content --- */}
      {itemCount === 0 ? (
        <Card className="text-center p-12">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">Your thrift cart is empty</h2>
          <p className="text-gray-500 mt-2">Find some unique items!</p>
          <Button asChild className="mt-6">
            <a href="/thrift" className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 h-11 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Marketplace
            </a>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* --- Item List (Left Side) --- */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Items</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-200">
                {items.map(item => (
                  <ThriftCartItemRow key={item.productId} item={item} />
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* --- Summary (Right Side) --- */}
          <div className="md:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-lg font-medium text-gray-600">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                <Separator />

                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full text-lg" 
                  onClick={handleCheckout} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    `Proceed to Checkout ($${total.toFixed(2)})`
                  )}
                </Button>
              </CardFooter>
            </Card>
            {error && (
              <p className="text-red-600 text-sm mt-4">{error}</p>
            )}
          </div>
        </div>
      )}

      {/* --- Navigation --- */}
      <BottomNav currentPage="thrift" />
    </div>
  );
}