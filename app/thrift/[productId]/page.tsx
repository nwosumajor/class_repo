"use client";

import React, { useState, useEffect } from 'react';
// import { useParams, useRouter } from 'next/navigation'; // <-- REMOVED
import { useAuth } from '../../../lib/AuthContext'; // <-- FIXED PATH (3 levels up)
import { BottomNav } from '../../../components/BottomNav'; // <-- FIXED PATH (3 levels up)
import { useThriftCart } from '../../../lib/ThriftCartContext'; // <-- 1. IMPORT THRIFT CART
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ShoppingBag, User, Check } from 'lucide-react';

// --- 1. TYPESCRIPT INTERFACE (From File 32: models/product.js) ---
interface IProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  image: string | null;
  createdAt: string;
}

// Helper hook to read the productId from the URL on the client
function useProductId() {
  const [productId, setProductId] = useState<string | null>(null);
  useEffect(() => {
    // window.location.pathname is only available on the client
    const pathSegments = window.location.pathname.split('/');
    const id = pathSegments.pop() || pathSegments.pop(); // Get the last segment
    if (id) {
      setProductId(id);
    }
  }, []);
  return productId;
}

// --- 2. MAIN PAGE COMPONENT ---
export default function ProductDetailPage() {
  const productId = useProductId(); // Use our new hook
  const { apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const { addItem } = useThriftCart(); // <-- 2. GET 'addItem' FUNCTION
  
  const [product, setProduct] = useState<IProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false); // State for button feedback

  useEffect(() => {
    if (isAuthLoading || !productId) return; // Wait for auth and ID

    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 13/18: GET /api/products/:id
      const url = `${apiBaseUrl.replace('/auth', '')}/products/${productId}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch product");
        }
        setProduct(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [apiBaseUrl, isAuthLoading, productId]);

  const handleAddToCart = () => {
    if (!product) return;

    // --- 3. CALL 'addItem' FROM CONTEXT ---
    addItem({
      productId: product._id,
      name: product.title,
      price: product.price,
      image: product.image,
      sellerId: product.seller._id,
    });
    
    // Give user visual feedback
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
    }, 2000); // Reset after 2 seconds
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p>Loading product...</p>
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
    
    if (!product) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-gray-700">Product Not Found</h3>
          <p className="text-gray-500 mt-2">This item may no longer be available.</p>
        </div>
      );
    }
    
    const imageUrl = product.image || `https://placehold.co/600x400/E9D5FF/3730A3?text=${encodeURIComponent(product.title)}`;

    return (
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Column */}
          <div className="bg-gray-100">
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-96 object-cover"
              onError={(e: any) => e.target.src = 'https://placehold.co/600x400/F3F4F6/9CA3AF?text=Image+Not+Found'}
            />
          </div>
          
          {/* Details Column */}
          <div className="flex flex-col">
            <CardHeader>
              <Badge variant="outline" className="w-fit mb-2">{product.category}</Badge>
              <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
            </CardHeader>
            
            <CardContent className="flex-grow space-y-6">
              <p className="text-3xl font-extrabold text-indigo-700">
                ${product.price.toFixed(2)}
              </p>
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Description</h4>
                <p className="text-base text-gray-700">
                  {product.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-indigo-100 rounded-full">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500">Sold by</p>
                  <p className="text-base font-medium text-gray-900">{product.seller.name}</p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              {/* --- 4. ADDED BUTTON LOGIC --- */}
              <Button 
                size="lg" 
                className={`w-full text-lg ${addedToCart ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`} 
                onClick={handleAddToCart}
                disabled={addedToCart}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </CardFooter>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 pb-24 md:pb-8">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <a href="/thrift">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
          </a>
        </Button>
      </div>

      {renderContent()}

      <BottomNav currentPage="thrift" />
    </div>
  );
}