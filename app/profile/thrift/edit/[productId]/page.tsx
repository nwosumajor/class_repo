"use client";

import React, { useState, useEffect } from 'react';
// import { useParams, useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../../../lib/AuthContext'; // <-- FIXED PATH (5 levels up)
import { BottomNav } from '../../../../../components/BottomNav'; // <-- FIXED PATH (5 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

// --- Types ---
// From File 32
interface IProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image: string | null;
}
// From File 37
interface IUploadResponse {
  success: boolean;
  message: string;
  secure_url: string;
}
// From File 13
interface IProductUpdateResponse {
  success: boolean;
  message: string;
  data: IProduct;
}

// Helper hook to read the productId from the URL
function useProductId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    // window.location.pathname is only available on the client
    const pathSegments = window.location.pathname.split('/');
    const productId = pathSegments.pop() || pathSegments.pop(); // Get the last segment
    if (productId) setId(productId);
  }, []);
  return id;
}

export default function EditProductPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  // const router = useRouter(); // <-- REMOVED
  const productId = useProductId();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); // Loading product data
  const [isSubmitting, setIsSubmitting] = useState(false); // Submitting form
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch existing product data ---
  useEffect(() => {
    if (isAuthLoading || !productId) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in.");
      return;
    }

    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 18: GET /api/products/:id
      const url = `${apiRoot}/products/${productId}`;
      try {
        const response = await fetch(url); // No token needed for public GET
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch product.');
        
        const product: IProduct = data.data;
        // Pre-fill the form
        setFormData({
          title: product.title,
          description: product.description,
          price: product.price,
          category: product.category,
        });
        if (product.image) {
          setImagePreview(product.image);
          setExistingImageUrl(product.image);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [apiBaseUrl, isAuthLoading, token, productId, apiRoot]);

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
      setUploadStatus('idle'); 
    }
  };

  // --- 2. Handle Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      setError("You must be logged in to update an item.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setFormSuccess(null);
    let finalImageUrl: string | null = existingImageUrl; // Start with the old image

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

      // --- Step 2b: Update Product ---
      const productData = {
        ...formData,
        image: finalImageUrl, // Send the new or existing URL
      };

      // From File 18: PUT /api/products/:id
      const productUrl = `${apiRoot}/products/${productId}`;
      const productRes = await fetch(productUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      const productResult: IProductUpdateResponse = await productRes.json();
      if (!productResult.success) {
        throw new Error(productResult.message || 'Failed to update product.');
      }

      // --- Step 3: Success! ---
      setFormSuccess('Product updated successfully!');
      
      // Update form fields with saved data
      setFormData({
        title: productResult.data.title,
        description: productResult.data.description,
        price: productResult.data.price,
        category: productResult.data.category,
      });
      setExistingImageUrl(productResult.data.image);
      
      // Redirect to the "My Products" page
      setTimeout(() => {
        // router.push(`/profile/thrift/products`); // <-- REPLACED
        window.location.href = `/profile/thrift/products`; // <-- FIXED
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
        <Button asChild variant="outline" size="icon">
          <a href="/profile/thrift/products"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Update Item Details</CardTitle>
          </CardHeader>
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
                    <span className="mt-2 block font-medium">Click to change image</span>
                    <input id="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                  </label>
                )}
              </div>
              {uploadStatus === 'uploading' && <p className="text-sm text-indigo-600 mt-2"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Uploading...</p>}
              {uploadStatus === 'success' && <p className="text-sm text-green-600 mt-2"><CheckCircle className="h-4 w-4 inline mr-2" />New Image Uploaded!</p>}
            </div>

            {/* --- Text Fields --- */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
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
              />
            </div>
            
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
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
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <BottomNav currentPage="profile" />
    </div>
  );
}