"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- FIXED PATH (2 levels up)
import { useCart } from '@/lib/CartContext'; // <-- FIXED PATH (2 levels up)
import { BottomNav } from '@/components/BottomNav'; // <-- FIXED PATH (2 levels up)
import { LeaveReviewDialog } from '../../components/food/LeaveReviewDialog'; // <-- FIXED PATH (2 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, PlusCircle, Star, Tag, Percent, Trash2 } from 'lucide-react';
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
// import { useParams } from 'next/navigation'; // <-- REMOVED

// --- Types ---
interface IMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  imageUrl?: string;
}
interface IReview {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}
interface IOffer {
  _id: string;
  title: string;
  type: 'discount' | 'bundle';
  percentage?: number;
  startAt: string;
  endAt: string;
}

// --- NEW: Helper hook to read the restaurantId from the URL ---
function useRestaurantId() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    // This only runs on the client, avoiding build errors
    const pathSegments = window.location.pathname.split('/');
    const restaurantId = pathSegments.pop() || pathSegments.pop(); // Get the last segment
    if (restaurantId) {
      setId(restaurantId);
    }
  }, []);
  return id;
}


// --- Menu Item Card ---
const MenuItemCard: React.FC<{ item: IMenuItem, onAdd: () => void }> = ({ item, onAdd }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <CardTitle className="text-lg">{item.name}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-sm text-gray-600">{item.description}</p>
    </CardContent>
    <CardFooter className="flex justify-between items-center">
      <span className="text-xl font-bold text-gray-800">${item.price.toFixed(2)}</span>
      <Button size="sm" onClick={onAdd} disabled={!item.available}>
        {item.available ? <PlusCircle className="h-4 w-4 mr-2" /> : null}
        {item.available ? 'Add' : 'Unavailable'}
      </Button>
    </CardFooter>
  </Card>
);

// --- Review Card ---
const ReviewCard: React.FC<{ 
  review: IReview;
  currentUserId: string | null;
  onDelete: (reviewId: string) => void;
  isDeleting: boolean;
}> = ({ review, currentUserId, onDelete, isDeleting }) => {
  const isMyReview = review.user._id === currentUserId;

  return (
    <Card className="bg-gray-50">
      <CardHeader className="flex flex-row justify-between items-start pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{review.user.name}</CardTitle>
          <div className="flex items-center space-x-1 text-yellow-500 mt-1">
            <span className="font-bold">{review.rating}</span>
            <Star className="w-4 h-4 fill-current" />
          </div>
        </div>
        {isMyReview && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your review. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(review._id)} className="bg-red-600 hover:bg-red-700">
                  Delete Review
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
        <p className="text-xs text-gray-400 mt-2">
          {new Date(review.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
};

// --- Offer Card ---
const OfferCard: React.FC<{ offer: IOffer }> = ({ offer }) => (
  <Card className="border-indigo-200 bg-indigo-50">
    <CardContent className="p-4 flex items-center space-x-3">
      <div className="p-2 bg-indigo-100 rounded-full">
        {offer.type === 'discount' ? 
          <Percent className="w-5 h-5 text-indigo-700" /> : 
          <Tag className="w-5 h-5 text-indigo-700" />
        }
      </div>
      <div>
        <p className="font-bold text-indigo-800">{offer.title}</p>
        <p className="text-sm text-indigo-600">
          {offer.type === 'discount' ? `${offer.percentage}% off your order` : 'Special bundle deal'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Valid until: {new Date(offer.endAt).toLocaleDateString()}
        </p>
      </div>
    </CardContent>
  </Card>
);


// --- Main Page ---
export default function RestaurantDetailPage() {
  const restaurantId = useRestaurantId(); // <-- FIXED
  
  const { apiBaseUrl, isLoading: isAuthLoading, user, token } = useAuth();
  const { addItem } = useCart();
  
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [offers, setOffers] = useState<IOffer[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Create a memoized fetch function
  const fetchData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    const apiRoot = apiBaseUrl.replace('/auth', '');
    
    try {
      const [menuRes, reviewsRes, offersRes] = await Promise.all([
        fetch(`${apiRoot}/menus/restaurant/${id}`),
        fetch(`${apiRoot}/reviews/restaurant/${id}`),
        fetch(`${apiRoot}/offers/restaurant/${id}`)
      ]);

      const menuData = await menuRes.json();
      if (!menuData.success) throw new Error(menuData.message || "Failed to fetch menu");
      setMenuItems(menuData.data);
      
      const reviewsData = await reviewsRes.json();
      if (!reviewsData.success) throw new Error(reviewsData.message || "Failed to fetch reviews");
      setReviews(reviewsData.data);

      const offersData = await offersRes.json();
      if (!offersData.success) throw new Error(offersData.message || "Failed to fetch offers");
      setOffers(offersData.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]); 

  // Initial data fetch
  useEffect(() => {
    if (!isAuthLoading && restaurantId) {
      fetchData(restaurantId);
    }
  }, [isAuthLoading, restaurantId, fetchData]);

  // Callback for when a new review is submitted
  const handleReviewSubmitted = () => {
    if (restaurantId) {
      fetchData(restaurantId); // Refetch all data
    }
  };
  
  // Handle Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    setIsDeleting(reviewId);
    setError(null);

    const url = `${apiBaseUrl.replace('/auth', '')}/reviews/${reviewId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete review.');

      // Remove from state on success
      setReviews(prev => prev.filter(r => r._id !== reviewId));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAddItemToCart = (item: IMenuItem) => {
    addItem({
      itemId: item._id,
      name: item.name,
      price: item.price,
      restaurantId: restaurantId!, 
      restaurantName: "Restaurant Name" // TODO: We need to fetch and pass restaurant name
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
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
    return (
      <div className="space-y-12">
        
        {offers.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Promotions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map(offer => (
                <OfferCard key={offer._id} offer={offer} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <MenuItemCard 
                key={item._id} 
                item={item} 
                onAdd={() => handleAddItemToCart(item)} 
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Reviews</h2>
            {restaurantId && (
              <LeaveReviewDialog 
                restaurantId={restaurantId} 
                onReviewSubmit={handleReviewSubmitted} 
              />
            )}
          </div>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet. Be the first!</p>
            ) : (
              reviews.map(review => (
                <ReviewCard 
                  key={review._id} 
                  review={review}
                  currentUserId={user?._id || null}
                  onDelete={handleDeleteReview}
                  isDeleting={isDeleting === review._id}
                />
              ))
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 pb-24">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <a href="/food">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Restaurants
          </a>
        </Button>
      </div>
      
      {renderContent()}

      <BottomNav currentPage="food" />
    </div>
  );
}