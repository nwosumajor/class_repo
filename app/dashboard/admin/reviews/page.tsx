"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Eye, EyeOff, MessageSquare, Star } from 'lucide-react';
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
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';

// --- Types (from File 6: review.model.js) ---
interface IReview {
  _id: string;
  user: {
    _id: string;
    name: string;
  };
  restaurant: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  visible: boolean;
  createdAt: string;
}

interface IReviewListResponse {
  success: boolean;
  data: IReview[];
  message?: string;
}

// --- Main Page Component ---
export default function AdminReviewsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Stores the ID of the review being updated

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch All Reviews ---
  const fetchReviews = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // !!! TODO: This endpoint doesn't exist yet! (File 21 has no all-reviews route)
    // We are *assuming* a route like '/api/admin/reviews' will be created.
    // For now, this will fail gracefully.
    const url = `${apiRoot}/admin/reviews`; // Placeholder
    
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: IReviewListResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch reviews');
      setReviews(data.data);
    } catch (err: any) {
      setError(`Failed to fetch reviews. (Note: The backend endpoint ${url} may not exist yet.)`);
      setReviews([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [apiRoot, token]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || user?.role !== 'admin') {
      setError("You must be an admin to view this page.");
      setIsLoading(false);
      return;
    }
    fetchReviews();
  }, [isAuthLoading, token, user?.role, fetchReviews]);

  // --- 2. Handle Toggle Visibility ---
  const handleToggle = async (reviewId: string, currentVisibility: boolean) => {
    setIsUpdating(reviewId);
    setError(null);

    // From File 21: PUT /api/reviews/admin/:id/toggle
    const url = `${apiRoot}/reviews/admin/${reviewId}/toggle`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to toggle review.');

      // Update local state
      setReviews(prev => prev.map(r => 
        r._id === reviewId ? { ...r, visible: result.data.visible } : r
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };
  
  // --- 3. Handle Delete ---
  const handleDelete = async (reviewId: string) => {
    setIsUpdating(reviewId);
    setError(null);
    
    // From File 21: DELETE /api/reviews/:id
    const url = `${apiRoot}/reviews/${reviewId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete.');
      
      // Remove from state
      setReviews(prev => prev.filter(r => r._id !== reviewId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // --- Render Functions ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading all reviews...</p>
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

    if (reviews.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Reviews Found</h3>
          <p className="text-gray-500 mt-2">There are no reviews in the system yet.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visible</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead className="text-right">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell>
                    <Switch
                      checked={review.visible}
                      onCheckedChange={() => handleToggle(review._id, review.visible)}
                      disabled={isUpdating === review._id}
                      aria-label="Toggle review visibility"
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium max-w-xs truncate" title={review.comment}>{review.comment}</p>
                    <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="font-bold mr-1">{review.rating}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{review.user.name}</div>
                  </TableCell>
                   <TableCell>
                    <div className="font-medium">{review.restaurant.name}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isUpdating === review._id}>
                          {isUpdating === review._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this review. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(review._id)} className="bg-red-600 hover:bg-red-700">
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Moderate Reviews</h1>
      {renderContent()}
    </div>
  );
}