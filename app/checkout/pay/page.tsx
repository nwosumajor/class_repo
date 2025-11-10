"use client"; // This must be the very first line

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, StripeCardElementOptions } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';

// --- 1. Load Stripe ---
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ''
);

// --- 2. Stripe Card Element Styling ---
const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

/**
 * The internal checkout form component
 */
function CheckoutForm({ orderId, total }: { orderId: string, total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { token, apiBaseUrl } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe.js has not loaded yet.");
      setIsLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create a PaymentMethod from the CardElement
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message || "Failed to create payment method.");
      }

      // 2. Send the payment_method_id to YOUR backend (File 12, 20)
      const response = await fetch(
        `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/${orderId}/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentMethod: 'stripe',
            payment_method_id: paymentMethod.id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Payment failed on backend.');
      }

      // 3. Payment Success!
      router.push(`/order/success?orderId=${orderId}`);

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-300 rounded-lg bg-white">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full text-lg" disabled={!stripe || isLoading}>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" /> Pay ${total.toFixed(2)} Securely
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Main UI component that reads the URL parameters
 */
function PaymentUI() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const total = searchParams.get('total');
  const totalAmount = Number(total) || 0;

  if (!orderId || !total) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Invalid or missing order details. Please return to your cart and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Complete Your Payment</CardTitle>
        <p className="text-center text-gray-500 text-sm">
          Order ID: {orderId.substring(0, 12)}...
        </p>
      </CardHeader>
      <CardContent>
        {/* The <Elements> provider wraps the checkout form */}
        <Elements stripe={stripePromise}>
          <CheckoutForm orderId={orderId} total={totalAmount} />
        </Elements>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-gray-400 text-center w-full">
          All payments are securely processed by Stripe.
        </p>
      </CardFooter>
    </Card>
  );
}

/**
 * The main page component that wraps the UI in a Suspense boundary
 * This is required by Next.js when using `useSearchParams`.
 */
export default function PaymentPage() {
  return (
    <div className="max-w-md mx-auto p-4 pt-12 min-h-screen">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <PaymentUI />
      </Suspense>
    </div>
  );
}