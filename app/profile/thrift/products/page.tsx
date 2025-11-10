"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- FIXED: Using @/ alias
import { BottomNav } from '@/components/BottomNav'; // <-- FIXED: Using @/ alias
import Link from 'next/link'; // <-- FIXED: Using standard Next.js import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ShoppingBag, Edit, Trash2, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from '@/components/ui/badge';

// --- Types (from File 32: models/product.js) ---
interface IProduct {
  _id: string;
  title: string;
  price: number;
  category: string;
  image: string | null;
}

// Full API response for GET /api/products
interface IProductResponse {
  success: boolean;
  data: IProduct[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
  };
  message?: string;
}

// --- Main Page Component ---
export default function MyProductsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch Seller's Products ---
  const fetchProducts = React.useCallback(async () => {
    if (!user) return; // Guard
    
    setIsLoading(true);
    setError(null);
    
    // We use the existing GET /api/products endpoint (File 18)
    // and filter by seller ID
    const url = `${apiRoot}/products?seller=${user._id}`; 
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: IProductResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch products');
      setProducts(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiRoot, token, user]); // Added dependencies

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || !user) {
      setIsLoading(false);
      setError("You must be logged in to view your products.");
      return;
    }
    fetchProducts();
  }, [isAuthLoading, token, user, fetchProducts]); // Use fetchProducts

  // --- 2. Handle Delete ---
  const handleDelete = async (productId: string) => {
    setIsDeleting(productId);
    setError(null);
    
    // From File 18: DELETE /api/products/:id
    const url = `${apiRoot}/products/${productId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete.');
      
      // Remove from state on success
      setProducts(prev => prev.filter(p => p._id !== productId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // --- Render Functions ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your products...</p>
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

    if (products.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Products Found</h3>
          <p className="text-gray-500 mt-2">You haven't listed any items for sale yet.</p>
          <Button asChild className="mt-6">
            <Link href="/profile/thrift/new">+ Sell Your First Item</Link>
          </Button>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div className="font-medium">{product.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {/* --- NEW EDIT BUTTON --- */}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/profile/thrift/edit/${product._id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    {/* --- NEW DELETE BUTTON --- */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isDeleting === product._id}>
                          {isDeleting === product._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{product.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(product._id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link href="/profile"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">My Products for Sale</h1>
      </div>
      
      <div className="flex justify-end mb-6">
        <Button asChild size="lg">
          <Link href="/profile/thrift/new">
            <Plus className="h-5 w-5 mr-2" /> List New Item
          </Link>
        </Button>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}