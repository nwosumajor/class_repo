"use client";

import React, { useState, useEffect } from 'react';
// import Link from 'next/link'; // <-- REMOVED
import { useAuth } from '@/lib/AuthContext'; // <-- FIXED PATH
import { BottomNav } from '@/components/BottomNav'; // <-- FIXED PATH
import { useThriftCart } from '@/lib/ThriftCartContext'; // <-- 1. IMPORT THRIFT CART
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Tag, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';

// --- 1. TYPESCRIPT INTERFACES (From Backend Files) ---

// From File 32: models/product.js
interface IProduct {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller: {
    name: string;
    email: string;
  };
  image: string | null;
  createdAt: string;
}

// From File 33/46: The 'ad' object in the response
interface IAd {
  id: string;
  creative: {
    headline: string;
    body: string;
    destinationUrl: string;
  };
  title: string;
}

// The full API response for GET /api/products (File 13)
interface IProductResponse {
  success: boolean;
  data: IProduct[];
  ad: IAd | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
  };
  // Optional message from the API for error reporting
  message?: string;
}

// --- 2. HELPER COMPONENTS ---

// Product Card Component
const ProductCard: React.FC<{ product: IProduct }> = ({ product }) => {
  const imageUrl = product.image || `https://placehold.co/400x300/E9D5FF/3730A3?text=${encodeURIComponent(product.title)}`;
  
  return (
    <Card className="overflow-hidden group h-full flex flex-col">
      <div className="overflow-hidden">
        <img
          src={imageUrl}
          alt={product.title}
          className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e: any) => e.target.src = 'https://placehold.co/400x300/F3F4F6/9CA3AF?text=Image+Not+Found'}
        />
      </div>
      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="flex-grow">
          <span className="text-xs font-semibold uppercase text-indigo-600">
            {product.category}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-1 truncate">
            {product.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Sold by {product.seller.name}
          </p>
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <p className="text-xl font-extrabold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
          <Button asChild size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700">
            {/* --- FIXED: Replaced Link with <a> tag --- */}
            <a href={`/thrift/${product._id}`}>
              View <ArrowRight className="h-4 w-4 ml-1" />
            </a >
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Sponsored Ad Card Component
const AdCard: React.FC<{ ad: IAd }> = ({ ad }) => {
  return (
    <a href={ad.creative.destinationUrl} target="_blank" rel="noopener noreferrer">
      <Card className="overflow-hidden group h-full flex flex-col border-2 border-yellow-400 bg-yellow-50 hover:shadow-lg">
        <div className="h-48 bg-yellow-100 flex items-center justify-center">
          <Tag className="h-12 w-12 text-yellow-500" />
        </div>
        <CardContent className="p-4 flex-grow">
          <span className="text-xs font-semibold uppercase text-yellow-700">
            Sponsored
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-1 truncate">
            {ad.creative.headline}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {ad.creative.body}
          </p>
        </CardContent>
        <div className="p-4 bg-yellow-100 text-center text-yellow-800 font-bold text-sm group-hover:bg-yellow-200 transition-colors">
          Learn More
        </div>
      </Card>
    </a>
  );
}

// --- 3. MAIN PAGE COMPONENT ---
export default function ThriftMarketplacePage() {
  const { apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const { itemCount: thriftItemCount } = useThriftCart(); // <-- 2. GET THRIFT CART COUNT
  
  const [products, setProducts] = useState<IProduct[]>([]);
  const [ad, setAd] = useState<IAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth to be ready
    
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      const url = `${apiBaseUrl.replace('/auth', '')}/products?page=${page}`;

      try {
        const response = await fetch(url);
        const data: IProductResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || "Failed to fetch products");
        }
        
        setProducts(data.data);
        setAd(data.ad);
        setTotalPages(data.pagination.totalPages);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, [apiBaseUrl, isAuthLoading, page]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p>Loading thrift items...</p>
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
          <p className="text-gray-500 mt-2">Check back soon for new items!</p>
        </div>
      );
    }
    
    const allItems: (IProduct | IAd)[] = [...products];
    if (ad) {
      allItems.splice(2, 0, ad);
    }

    const isAd = (item: IProduct | IAd): item is IAd => {
      return typeof (item as any).creative === 'object' && (item as any).creative !== null;
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allItems.map((item, index) =>
          isAd(item) ? (
            <AdCard key={item.id || `ad-${index}`} ad={item} />
          ) : (
            <ProductCard key={item._id} product={item} />
          )
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 pb-24 md:pb-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-indigo-700">Thrift Marketplace 🛍️</h2>
        <div className="flex space-x-2">
          {/* --- 3. ADDED CONDITIONAL CART BUTTON --- */}
          {thriftItemCount > 0 && (
            <Button asChild variant="outline">
              <a href="/thrift/cart" className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Cart
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                  {thriftItemCount}
                </span>
              </a>
            </Button>
          )}
          <Button asChild>
            <a href="/profile/thrift/new">
              + Sell an Item
            </a>
          </Button>
        </div>
      </div>
      
      {/* Search Bar (Future) */}
      <div className="flex space-x-2 mb-8">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Search for vintage, apparel, etc..."
            className="pl-10 text-base"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button type="submit">Search</Button>
      </div>
      
      {/* --- Main Content --- */}
      {renderContent()}
      
      {/* Pagination (Future) */}
      <div className="flex justify-center mt-12 space-x-2">
        <Button 
          variant="outline" 
          disabled={page <= 1} 
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          disabled={page >= totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>

      <BottomNav currentPage="thrift" />
    </div>
  );
}