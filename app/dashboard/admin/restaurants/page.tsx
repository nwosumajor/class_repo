"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X, Building } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// --- Types (from File 5/19: restaurant.model.js) ---
interface IRestaurant {
  _id: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  name: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// --- Main Page Component ---
export default function AdminRestaurantsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState<string | null>(null); // For buttons
  const [rejectionNotes, setRejectionNotes] = useState('');

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- Fetch Pending Restaurants ---
  const fetchPending = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 19: GET /api/restaurants/admin/pending
    const url = `${apiRoot}/restaurants/admin/pending`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setRestaurants(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || user?.role !== 'admin') {
      setError("You must be an admin to view this page.");
      setIsLoading(false);
      return;
    }
    fetchPending();
  }, [apiBaseUrl, isAuthLoading, token, user?.role]); // Removed fetchPending from dependencies

  // --- Handle Approval ---
  const handleApprove = async (restaurantId: string) => {
    setIsUpdating(restaurantId);
    setError(null);
    
    // From File 19: POST /api/restaurants/admin/:id/approve
    const url = `${apiRoot}/restaurants/admin/${restaurantId}/approve`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to approve.');
      
      // Remove from list on success
      setRestaurants(prev => prev.filter(r => r._id !== restaurantId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // --- Handle Rejection ---
  const handleReject = async (restaurantId: string) => {
    if (!rejectionNotes) {
      setError("Rejection notes are required.");
      return;
    }
    setIsUpdating(restaurantId);
    setError(null);
    
    // From File 19: POST /api/restaurants/admin/:id/reject
    const url = `${apiRoot}/restaurants/admin/${restaurantId}/reject`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approvalNotes: rejectionNotes }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to reject.');
      
      // Remove from list on success
      setRestaurants(prev => prev.filter(r => r._id !== restaurantId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
      setRejectionNotes(''); // Clear notes
    }
  };

  // --- Render Functions ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading pending restaurants...</p>
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

    if (restaurants.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">All Clear!</h3>
          <p className="text-gray-500 mt-2">There are no pending restaurant approvals.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.owner.name}</div>
                    <div className="text-xs text-gray-500">{r.owner.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={() => handleApprove(r._id)}
                      disabled={isUpdating === r._id}
                    >
                      {isUpdating === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    
                    <Dialog onOpenChange={() => { setError(null); setRejectionNotes(''); }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          disabled={isUpdating === r._id}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Restaurant: {r.name}?</DialogTitle>
                          <DialogDescription>
                            Please provide a reason for rejection. This will be saved for your records.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                          <Label htmlFor="rejectionNotes">Rejection Notes</Label>
                          <Textarea 
                            id="rejectionNotes"
                            value={rejectionNotes}
                            onChange={(e) => setRejectionNotes(e.target.value)}
                            placeholder="e.g., Invalid business certificate..."
                          />
                          {error && <p className="text-red-600 text-sm">{error}</p>}
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <Button 
                            onClick={() => handleReject(r._id)} 
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isUpdating === r._id}
                          >
                            {isUpdating === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Rejection'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
      <h1 className="text-3xl font-bold text-gray-900">Approve Restaurants</h1>
      {renderContent()}
    </div>
  );
}