"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- FIXED PATH (3 levels up)
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, MessageSquare } from 'lucide-react';

// --- Types ---
// From File 51: foodOrder.model.js
interface IOrder {
  _id: string;
  restaurant: string; // Just the ID
}
// From File 21/25: review.routes.js / review.controller.js
interface IReviewCreate {
  orderId: string;
  rating: number;
  comment: string;
}

/**
 * StarRating Component
 */
const StarRating: React.FC<{ rating: number; onRatingChange: (rating: number) => void }> = ({ rating, onRatingChange }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-8 w-8 cursor-pointer ${
            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => onRatingChange(star)}
        />
      ))}
    </div>
  );
};

/**
 * LeaveReviewDialog Component
 */
export const LeaveReviewDialog: React.FC<{ restaurantId: string; onReviewSubmit: () => void }> = ({ restaurantId, onReviewSubmit }) => {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [orderId, setOrderId] = useState(''); // We need a valid order ID
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // --- HACK: Find a valid order to review ---
  // In a real app, you'd pass the specific orderId
  // For now, we fetch the user's orders and find one for this restaurant
  useEffect(() => {
    if (!dialogOpen || !token || !user) return;

    const findOrderToReview = async () => {
      // From File 12/20: GET /api/restaurants/orders/me
      const url = `${apiBaseUrl.replace('/auth', '')}/restaurants/orders/me`;
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        // Find a 'delivered' order for this restaurant
        const validOrder = data.data.find((order: any) => 
          order.restaurant._id === restaurantId && order.status === 'delivered'
        );
        
        if (validOrder) {
          setOrderId(validOrder._id);
        } else {
          setError("You must have a completed (delivered) order to leave a review.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    findOrderToReview();
  }, [dialogOpen, token, user, apiBaseUrl, restaurantId]);

  // --- Handle Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating (1-5 stars).");
      return;
    }
    if (!orderId) {
      setError("Could not find a valid order to review.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // From File 21/25: POST /api/reviews
    const url = `${apiBaseUrl.replace('/auth', '')}/reviews`;
    const body: IReviewCreate = {
      orderId,
      rating,
      comment,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!result.success) {
         // Handle duplicate review error (File 25)
        if (result.message.includes('already reviewed')) {
          throw new Error("You have already submitted a review for this order.");
        }
        throw new Error(result.message || 'Failed to submit review.');
      }
      
      // Success!
      onReviewSubmit(); // Tell parent to refetch reviews
      setDialogOpen(false); // Close dialog

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Leave a Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience with this restaurant.
          </DialogDescription>
        </DialogHeader>
        
        {!orderId && !error && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Finding your order...</span>
          </div>
        )}

        {(orderId && !error) && (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2 text-center">
              <Label>Your Rating</Label>
              <div className="flex justify-center">
                <StarRating rating={rating} onRatingChange={setRating} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Your Review</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike?"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
              </Button>
            </DialogFooter>
          </form>
        )}
        
        {error && (
          <div className="p-4 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};