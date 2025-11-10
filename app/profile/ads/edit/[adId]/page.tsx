"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { BottomNav } from '@/components/BottomNav'; // <-- Using @/ alias
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
import { Loader2, ArrowLeft, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

// --- Types ---
// From File 60
interface IAd {
  _id: string;
  title: string;
  type: 'featured' | 'sidebar' | 'sponsored';
  targeting: {
    locations: string[];
    interests: string[];
  };
  creative: {
    headline: string;
    body: string;
    destinationUrl: string;
    imageUrl?: string;
  };
}
// From File 37
interface IUploadResponse {
  success: boolean;
  message: string;
  secure_url: string;
}
// From File 33/44
interface IAdUpdateResponse {
  success: boolean;
  message: string;
  data: IAd;
}

export default function EditAdPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const adId = params.adId as string;

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IAd['type']>('featured');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); // Loading ad data
  const [isSubmitting, setIsSubmitting] = useState(false); // Submitting form
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch existing ad data ---
  useEffect(() => {
    if (isAuthLoading || !adId) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in.");
      return;
    }

    const fetchAd = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 44: GET /api/ads/:id
      const url = `${apiRoot}/ads/${adId}`;
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch ad.');
        
        const ad: IAd = data.data;
        // Pre-fill the form
        setTitle(ad.title);
        setType(ad.type);
        setHeadline(ad.creative.headline);
        setBody(ad.creative.body);
        setDestinationUrl(ad.creative.destinationUrl);
        
        if (ad.creative.imageUrl) {
          setImagePreview(ad.creative.imageUrl);
          setExistingImageUrl(ad.creative.imageUrl);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAd();
  }, [apiBaseUrl, isAuthLoading, token, adId, apiRoot]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadStatus('idle'); 
    }
  };

  // --- 2. Handle Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("You must be logged in to update an ad.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setFormSuccess(null);
    let finalImageUrl: string | null = existingImageUrl;

    try {
      // --- Step 2a: Upload NEW Image (if one was selected) ---
      if (imageFile) {
        setUploadStatus('uploading');
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);

        const uploadUrl = `${apiRoot}/upload/image`; 
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadFormData,
        });

        const uploadData: IUploadResponse = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.message || 'Image upload failed.');
        
        finalImageUrl = uploadData.secure_url; // Use the new URL
        setUploadStatus('success');
      }

      // --- Step 2b: Update Ad ---
      // From File 33: Payload is { title, targeting, creative }
      const adData = {
        title,
        type, // Note: Your PUT /api/ads/:id doesn't handle 'type' update, but we'll send it.
        creative: {
          headline,
          body,
          destinationUrl,
          imageUrl: finalImageUrl || undefined,
        },
        // We're not updating targeting in this form
      };

      // From File 44: PUT /api/ads/:id
      const adUrl = `${apiRoot}/ads/${adId}`;
      const adRes = await fetch(adUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(adData),
      });

      const adResult: IAdUpdateResponse = await adRes.json();
      if (!adResult.success) {
        throw new Error(adResult.message || 'Failed to update ad.');
      }

      // --- Step 3: Success! ---
      setFormSuccess('Ad updated successfully! Redirecting...');
      
      // Update form fields with saved data
      const newAd = adResult.data;
      setTitle(newAd.title);
      setHeadline(newAd.creative.headline);
      setBody(newAd.creative.body);
      setDestinationUrl(newAd.creative.destinationUrl);
      if(newAd.creative.imageUrl) {
        setExistingImageUrl(newAd.creative.imageUrl);
        setImagePreview(newAd.creative.imageUrl);
      }
      
      setTimeout(() => {
        router.push(`/profile/ads/${adId}`); // Go back to the ad analytics page
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Ad</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ad Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Ad Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Ad Type / Placement</Label>
              <Select value={type} onValueChange={(v: IAd['type']) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured (In Product List)</SelectItem>
                  <SelectItem value="sidebar" disabled>Sidebar (Coming Soon)</SelectItem>
                  <SelectItem value="sponsored" disabled>Sponsored (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Creative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body Text</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationUrl">Destination URL</Label>
              <Input id="destinationUrl" type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <div className="mt-2 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-center p-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                  <label htmlFor="image-upload" className="cursor-pointer text-gray-500 hover:text-indigo-600">
                    <UploadCloud className="h-10 w-10 mx-auto" />
                    <span className="mt-2 block font-medium">Click to change image</span>
                    <input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                  </label>
                )}
              </div>
              {uploadStatus === 'uploading' && <p className="text-sm text-indigo-600 mt-2"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Uploading...</p>}
              {uploadStatus === 'success' && <p className="text-sm text-green-600 mt-2"><CheckCircle className="h-4 w-4 inline mr-2" />New Image Uploaded!</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardFooter className="flex flex-col items-stretch space-y-4 p-6">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" /> {error}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" /> {formSuccess}
              </div>
            )}
            <Button type="submit" size="lg" className="text-lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Ad Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <BottomNav currentPage="profile" />
    </div>
  );
}