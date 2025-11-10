"use client";

import React, { useState } from 'react';
// import { useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../lib/AuthContext'; // <-- FIXED PATH
import { useCart, ICartItem } from '../../lib/CartContext'; // <-- FIXED PATH
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BottomNav } from '../../components/BottomNav'; // <-- FIXED PATH
import { Loader2, Plus, Minus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
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

// Interface for the 'placeOrder' API response (File 12, 20)
interface IOrderResponse {
  success: boolean;
  data: {
    _id: string;
    status: string;
    // ... other order fields
  };
  message?: string;
}

/**
 * A single row component for an item in the cart
 */
const CartItemRow: React.FC<{ item: ICartItem }> = ({ item }) => {
  const { updateItemQty, removeItem } = useCart();

  return (
    <div className="flex items-center space-x-4 py-4">
      {/* Quantity Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateItemQty(item.itemId, item.qty - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-6 text-center font-bold">{item.qty}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateItemQty(item.itemId, item.qty + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Item Details */}
      <div className="flex-1">
        <h4 className="font-semibold">{item.name}</h4>
        <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
      </div>

      {/* Price & Remove */}
      <div className="flex flex-col items-end">
        <span className="font-bold text-lg">${(item.price * item.qty).toFixed(2)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600"
          onClick={() => removeItem(item.itemId)}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Remove
        </Button>
      </div>
    </div>
  );
};

/**
 * Main Cart Page Component
 */
export default function CartPage() {
  const { items, itemCount, cartTotal, currentRestaurantId, clearCart } = useCart();
  const { isAuthenticated, token, apiBaseUrl } = useAuth();
  // const router = useRouter(); // <-- REMOVED

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery state (simplified)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const deliveryFee = deliveryType === 'delivery' ? 5.00 : 0; // Example fee
  const total = cartTotal + deliveryFee;

  const handleCheckout = async () => {
    if (!isAuthenticated || !token || !currentRestaurantId) {
      setError("You must be logged in to place an order.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    // 1. Format items for the backend (File 12, 20)
    const orderItems = items.map(item => ({
      itemId: item.itemId,
      qty: item.qty,
    }));

    // 2. Create the order body
    const orderBody = {
      restaurantId: currentRestaurantId,
      items: orderItems,
      delivery: {
        type: deliveryType,
        // In a real app, you'd have an address form
        address: deliveryType === 'delivery' ? "User's saved address" : undefined,
      },
    };

    try {
      // 3. Call the 'placeOrder' API (File 12, 20)
      const response = await fetch(`${apiBaseUrl.replace('/auth', '')}/restaurants/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // <-- Send the auth token
        },
        body: JSON.stringify(orderBody),
      });

      const result: IOrderResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create order.');
      }

      // 4. Order created! Now we need to pay.
      // We will create a dedicated payment page for this.
      console.log('Order created:', result.data._id);
      
      // Clear the cart *after* successful order creation
      clearCart();

      // 5. Redirect to the new payment page (which we will build next)
      // router.push(`/checkout/pay?orderId=${result.data._id}&total=${total}`); // <-- REPLACED
      window.location.href = `/checkout/pay?orderId=${result.data._id}&total=${total}`; // <-- FIXED

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
    // We don't set isLoading(false) on success, because we are redirecting
  };

  const restaurantName = items.length > 0 ? items[0].restaurantName : "";

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
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
                  This will permanently remove all items from your current cart.
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
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">Your cart is empty</h2>
          <p className="text-gray-500 mt-2">Find something good to eat!</p>
          {/* <Button asChild className="mt-6"> */}
            {/* <Link href="/food"> */} {/* <-- REPLACED */}
            <a href="/food" className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 h-11 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md mt-6">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Restaurants
            </a>
            {/* </Link> */}
          {/* </Button> */}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* --- Item List (Left Side) --- */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Ordering from: {restaurantName}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-200">
                {items.map(item => (
                  <CartItemRow key={item.itemId} item={item} />
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
                {/* Simplified Delivery/Pickup Toggle */}
                <div className="flex space-x-2">
                  <Button 
                    variant={deliveryType === 'pickup' ? 'default' : 'outline'} 
                    onClick={() => setDeliveryType('pickup')}
                    className="flex-1"
                  >
                    Pickup
                  </Button>
                  <Button 
                    variant={deliveryType === 'delivery' ? 'default' : 'outline'}
                    onClick={() => setDeliveryType('delivery')}
                    className="flex-1"
                  >
                    Delivery
                  </Button>
                </div>

                <Separator />
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
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
      <BottomNav currentPage="cart" />
    </div>
  );
}