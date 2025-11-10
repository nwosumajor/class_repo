"use client";

import React, { useState } from 'react';
// import { useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH
import { BottomNav } from '../../../../components/BottomNav'; // <-- FIXED PATH
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, UploadCloud, CheckCircle } from 'lucide-react';

// --- Types ---
// From File 32: models/product.js
interface IProductCreate {
  title: string;
  description: string;
  price: number;
  category: string;
  image: string | null;
}

// From File 37: controllers/upload.controller.js
interface IUploadResponse {
  success: boolean;
  message: string;
  secure_url: string;
  public_id: string;
}

// From File 13: controllers/productController.js
interface IProductCreateResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    // ... other product fields
  };
}


export default function SellProductPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  // const router = useRouter(); // <-- REMOVED

  const [formData, setFormData] = useState<Omit<IProductCreate, 'image'>>({
    title: '',
    description: '',
    price: 0,
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadStatus('idle'); // Reset status if new file is chosen
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      setError("You must be logged in to sell an item.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFormSuccess(null);
    let uploadedImageUrl: string | null = null;

    try {
      // --- Step 1: Upload Image (if one exists) ---
      if (imageFile) {
        setUploadStatus('uploading');
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);

        // From File 35/44: POST /api/upload/image
        const uploadUrl = `${apiBaseUrl.replace('/auth', '')}/upload/image`; 
        
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: uploadFormData,
        });

        const uploadData: IUploadResponse = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.message || 'Image upload failed.');
        }
        
        uploadedImageUrl = uploadData.secure_url;
        setUploadStatus('success');
      }

      // --- Step 2: Create Product ---
      const productData: IProductCreate = {
        ...formData,
        image: uploadedImageUrl, // Add the URL from step 1
      };

      // From File 18: POST /api/products
      const productUrl = `${apiBaseUrl.replace('/auth', '')}/products`;
      const productRes = await fetch(productUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const productResult: IProductCreateResponse = await productRes.json();
      if (!productResult.success) {
        throw new Error(productResult.message || 'Failed to create product.');
      }

      // --- Step 3: Success! ---
      setFormSuccess('Product created successfully! Redirecting you...');
      
      // Reset form
      setFormData({ title: '', description: '', price: 0, category: '' });
      setImageFile(null);
      setImagePreview(null);
      
      // Redirect to the new product's page
      setTimeout(() => {
        // router.push(`/thrift/${productResult.data._id}`); // <-- REPLACED
        window.location.href = `/thrift/${productResult.data._id}`; // <-- FIXED
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-12">
        <Card className="text-center p-8">
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p>You must be logged in to sell an item.</p>
            <Button asChild>
              <a href="/">Login or Register</a>
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
          <a href="/thrift"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Sell a New Item</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            
            {/* --- Image Upload --- */}
            <div>
              <Label htmlFor="image" className="text-base font-semibold">Product Image</Label>
              <div className="mt-2 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-center p-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                  <label htmlFor="image-upload" className="cursor-pointer text-gray-500 hover:text-indigo-600">
                    <UploadCloud className="h-12 w-12 mx-auto" />
                    <span className="mt-2 block font-medium">Click to upload an image</span>
                    <span className="mt-1 block text-xs">PNG, JPG, GIF up to 10MB</span>
                    <input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                  </label>
                )}
              </div>
              {uploadStatus === 'uploading' && <p className="text-sm text-indigo-600 mt-2 flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</p>}
              {uploadStatus === 'success' && <p className="text-sm text-green-600 mt-2 flex items-center"><CheckCircle className="h-4 w-4 mr-2" />Image Uploaded!</p>}
            </div>

            {/* --- Text Fields --- */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Vintage 90s T-Shirt"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-base font-semibold">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-base font-semibold">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Apparel"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your item..."
              />
            </div>
            
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm font-medium">
                {formSuccess}
              </div>
            )}
            <Button type="submit" size="lg" className="text-lg" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Create Product Listing'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <BottomNav currentPage="profile" />
    </div>
  );
}