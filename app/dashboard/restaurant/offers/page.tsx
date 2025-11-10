"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2, Tag, Calendar, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// --- Types (from File 3: offer.model.js) ---
interface IOffer {
  _id: string;
  title: string;
  type: 'discount' | 'bundle';
  percentage?: number;
  bundleItems?: { item: string; qty: number }[]; // Note: We won't build the UI for this yet
  active: boolean;
  startAt: string; // ISO Date string
  endAt: string; // ISO Date string
}

// --- Helper: Offer Form (for Create/Edit) ---
const OfferForm: React.FC<{
  offer?: IOffer | null; // Pass offer to pre-fill for editing
  onSave: (offerData: Partial<IOffer>) => void;
  isLoading: boolean;
}> = ({ offer, onSave, isLoading }) => {
  
  // Helper to format date for input[type="date"]
  const formatDate = (isoDate: string) => isoDate ? new Date(isoDate).toISOString().split('T')[0] : '';

  const [formData, setFormData] = useState({
    title: offer?.title || '',
    type: offer?.type || 'discount',
    percentage: offer?.percentage || 0,
    startAt: formatDate(offer?.startAt || ''),
    endAt: formatDate(offer?.endAt || ''),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'percentage' ? parseFloat(value) : value,
    }));
  };
  
  const handleTypeChange = (value: 'discount' | 'bundle') => {
    setFormData(prev => ({ ...prev, type: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const offerData: Partial<IOffer> = {
      ...formData,
      type: formData.type as 'discount' | 'bundle',
      startAt: new Date(formData.startAt).toISOString(),
      endAt: new Date(formData.endAt).toISOString(),
    };
    // Clear percentage if it's a bundle
    if (offerData.type === 'bundle') {
      offerData.percentage = undefined;
    }
    onSave(offerData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Offer Title</Label>
        <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Offer Type</Label>
          <Select value={formData.type} onValueChange={handleTypeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">Discount (%)</SelectItem>
              <SelectItem value="bundle" disabled>Bundle (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="percentage">Discount %</Label>
          <Input 
            id="percentage" 
            name="percentage" 
            type="number" 
            step="1" 
            min="0" 
            max="100"
            value={formData.percentage} 
            onChange={handleChange} 
            disabled={formData.type !== 'discount'}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
         <div>
          <Label htmlFor="startAt">Start Date</Label>
          <Input id="startAt" name="startAt" type="date" value={formData.startAt} onChange={handleChange} required />
        </div>
         <div>
          <Label htmlFor="endAt">End Date</Label>
          <Input id="endAt" name="endAt" type="date" value={formData.endAt} onChange={handleChange} required />
        </div>
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Offer'}
        </Button>
      </DialogFooter>
    </form>
  );
};


// --- Main Page Component ---
export default function RestaurantOffersPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [offers, setOffers] = useState<IOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false); // For form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<IOffer | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch All Offers ---
  const fetchOffers = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 15: GET /api/offers/me
    const url = `${apiRoot}/offers/me`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setOffers(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view your offers.");
      return;
    }
    fetchOffers();
  }, [apiBaseUrl, isAuthLoading, token]); // Removed fetchOffers from dependencies

  // --- 2. Handle Create / Update ---
  const handleSaveOffer = async (offerData: Partial<IOffer>) => {
    setIsSubmitting(true);
    setError(null);

    const isEdit = !!editingOffer;
    const url = isEdit ? `${apiRoot}/offers/${editingOffer._id}` : `${apiRoot}/offers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(offerData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to save offer.');

      if (isEdit) {
        setOffers(prev => prev.map(o => o._id === editingOffer._id ? result.data : o));
      } else {
        setOffers(prev => [result.data, ...prev]);
      }
      
      setDialogOpen(false);
      setEditingOffer(null);
    } catch (err: any) {
      setError(err.message); // Show error inside the dialog
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. Handle Delete ---
  const handleDelete = async (offerId: string) => {
    setIsSubmitting(true); // Use same state as form
    // From File 15: DELETE /api/offers/:offerId
    const url = `${apiRoot}/offers/${offerId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete.');
      
      // Remove from state
      setOffers(prev => prev.filter(o => o._id !== offerId));
    } catch (err: any) {
      setError(err.message); // Show error on page
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingOffer(null);
    setError(null);
    setDialogOpen(true);
  };
  
  const openEditDialog = (offer: IOffer) => {
    setEditingOffer(offer);
    setError(null);
    setDialogOpen(true);
  };

  // --- Render Functions ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your offers...</p>
        </div>
      );
    }

    if (error && !dialogOpen) {
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      );
    }

    if (offers.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Offers Found</h3>
          <p className="text-gray-500 mt-2">Click "Add New Offer" to create a promotion.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => {
                const isExpired = new Date(offer.endAt) < new Date();
                return (
                  <TableRow key={offer._id} className={isExpired ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="font-medium">{offer.title}</div>
                      {isExpired && <Badge variant="outline" className="text-gray-500">Expired</Badge>}
                    </TableCell>
                    <TableCell className="capitalize">{offer.type}</TableCell>
                    <TableCell className="font-medium">
                      {offer.type === 'discount' ? `${offer.percentage}% OFF` : 'Bundle'}
                    </TableCell>
                    <TableCell>
                      {new Date(offer.endAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(offer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{offer.title}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(offer._id)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Manage Offers</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" /> Add New Offer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
              <DialogDescription>
                Fill in the details for your promotion.
              </DialogDescription>
            </DialogHeader>
            {error && dialogOpen && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            <OfferForm
              offer={editingOffer}
              onSave={handleSaveOffer}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {renderContent()}
    </div>
  );
}