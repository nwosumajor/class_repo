"use client";

import React, { useState } from 'react';
// import { useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { BottomNav } from '../../../../components/BottomNav'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, UploadCloud, CheckCircle, CreditCard, DollarSign } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// --- Types ---
// From File 60
interface IAdCreate {
  title: string;
  type: 'featured' | 'sidebar' | 'sponsored';
  budget: number;
  spendType: 'daily' | 'total';
  targeting: {
    locations: string[];
    interests: string[];
  };
  creative: {
    headline: string;
    body: string;
    destinationUrl: string;
    imageUrl?: string; // Optional
  };
  launch: boolean; // Custom field to tell backend to pay now
  payment?: { // Custom field for payment
    amount: number;
    method: string;
    data: {
      payment_method_id: string;
    };
  };
}
// From File 37
interface IUploadResponse {
  success: boolean;
  message: string;
  secure_url: string;
  public_id: string;
}
// From File 33
interface IAdCreateResponse {
  success: boolean;
  message: string;
  data: { _id: string };
}

// --- Stripe Setup ---
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontSize: "16px",
      "::placeholder": { color: "#aab7c4" },
    },
    invalid: { color: "#fa755a", iconColor: "#fa755a" },
  },
};


/**
 * The main Ad Creation Form component.
 * It's all one component because Stripe Elements needs to wrap the form.
 */
function AdCreationForm() {
  const { token, apiBaseUrl } = useAuth();
  // const router = useRouter(); // <-- REMOVED
  const stripe = useStripe();
  const elements = useElements();
  
  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IAdCreate['type']>('featured');
  const [budget, setBudget] = useState(100);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadStatus('idle');
      setUploadedImageUrl(null); // Reset if file changes
    }
  };

  // --- Image Upload Function ---
  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return null; // No image to upload
    if (uploadedImageUrl) return uploadedImageUrl; // Already uploaded

    setUploadStatus('uploading');
    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);

    const uploadUrl = `${apiBaseUrl.replace('/auth', '')}/upload/image`;
    
    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData,
      });

      const uploadData: IUploadResponse = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.message || 'Image upload failed.');
      
      setUploadStatus('success');
      setUploadedImageUrl(uploadData.secure_url); // Save URL
      return uploadData.secure_url;

    } catch (err: any) {
      setError(`Image Upload Error: ${err.message}`);
      setUploadStatus('idle');
      return null;
    }
  };

  // --- Main Form Submit Function ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError("Payment system not ready. Please wait.");
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. First, upload the image (if any)
      const imageUrl = await handleImageUpload();
      // If upload failed and an image was selected, stop
      if (imageFile && !imageUrl) {
        throw new Error("Image upload failed. Please try again.");
      }
      
      // 2. Create the Stripe PaymentMethod
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      if (pmError) throw new Error(pmError.message || "Failed to create payment method.");
      
      // 3. Construct the Full Ad Body (File 33)
      const adData: IAdCreate = {
        title,
        type,
        budget,
        spendType: 'total', // Hardcoding for simplicity
        targeting: { locations: [], interests: [] }, // TODO: Add form fields for these
        creative: {
          headline,
          body,
          destinationUrl,
          imageUrl: imageUrl || undefined,
        },
        launch: true, // Tell backend to pay and launch
        payment: { // Send payment data
          amount: budget,
          method: 'stripe',
          data: {
            payment_method_id: paymentMethod.id,
          }
        }
      };
      
      // 4. Submit to create the ad (File 33/44)
      const adUrl = `${apiBaseUrl.replace('/auth', '')}/ads`;
      const adRes = await fetch(adUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(adData),
      });

      const adResult: IAdCreateResponse = await adRes.json();
      if (!adResult.success) throw new Error(adResult.message || 'Failed to create ad.');
      
      // 5. Success!
      // router.push(`/profile/ads/${adResult.data._id}`); // <-- REPLACED
      window.location.href = `/profile/ads/${adResult.data._id}`; // <-- FIXED

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ad Details</CardTitle>
          <CardDescription>What are you advertising?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Ad Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., My Awesome Product" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Ad Type / Placement</Label>
            <Select value={type} onValueChange={(v: IAdCreate['type']) => setType(v)}>
              <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured (In Product List)</SelectItem>
                <SelectItem value="sidebar">Sidebar (Coming Soon)</SelectItem>
                <SelectItem value="sponsored">Sponsored (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Creative</CardTitle>
          <CardDescription>What will your ad look like?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="My Ad Headline" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body Text</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="A short, catchy description..." required />
          </div>
           <div className="space-y-2">
            <Label htmlFor="destinationUrl">Destination URL</Label>
            <Input id="destinationUrl" type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://my-product.com" required />
          </div>
          <div className="space-y-2">
            <Label>Image (Optional)</Label>
            <div className="mt-2 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-center p-4">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
              ) : (
                <label htmlFor="image-upload" className="cursor-pointer text-gray-500 hover:text-indigo-600">
                  <UploadCloud className="h-10 w-10 mx-auto" />
                  <span className="mt-2 block font-medium">Click to upload</span>
                  <input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
              )}
            </div>
            {uploadStatus === 'uploading' && <p className="text-sm text-indigo-600 mt-2"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Uploading...</p>}
            {uploadStatus === 'success' && <p className="text-sm text-green-600 mt-2"><CheckCircle className="h-4 w-4 inline mr-2" />Image Uploaded!</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget & Payment</CardTitle>
          <CardDescription>Set your total budget and pay to launch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget">Total Budget ($)</Label>
            <Input id="budget" type="number" min="5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Payment Card</Label>
            <div className="p-3 border rounded-lg bg-white">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          <Button type="submit" size="lg" className="text-lg" disabled={isLoading || !stripe || !elements}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <DollarSign className="h-5 w-5 mr-2" />
                Pay & Launch Ad (${budget.toFixed(2)})
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// --- Main Page Component (Wraps form in Elements) ---
export default function CreateAdPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  if (isAuthLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!user || (user.role !== 'user' && user.role !== 'admin')) {
     return (
      <div className="max-w-2xl mx-auto p-4 pt-12">
        <Card className="text-center p-8">
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p>You do not have permission to create ads.</p>
            <Button asChild>
              <a href="/profile">Back to Profile</a>
            </Button>
          </CardContent>
        </Card>
        <BottomNav currentPage="profile" />
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <a href="/profile/ads"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Ad</h1>
      </div>
      
      <Elements stripe={stripePromise}>
        <AdCreationForm />
      </Elements>
      
      <BottomNav currentPage="profile" />
    </div>
  );
}