"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert, ShieldCheck, Flag } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

// --- Types (from File 9/34: ad.admin.controller.js) ---
interface IAd {
  _id: string;
  title: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  type: 'featured' | 'sidebar' | 'sponsored';
  status: 'active' | 'paused' | 'expired' | 'draft' | 'completed' | 'rejected';
  flaggedCount: number;
  budget: number;
  totalSpent: number;
}

interface IAdListResponse {
  success: boolean;
  data: IAd[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalAds: number;
  };
  message?: string;
}

// --- Status Select Helper ---
const StatusSelect: React.FC<{ 
  ad: IAd;
  onUpdate: (adId: string, status: IAd['status']) => void;
  isLoading: boolean;
}> = ({ ad, onUpdate, isLoading }) => {
  const statuses: IAd['status'][] = ['active', 'paused', 'expired', 'draft', 'completed', 'rejected'];
  
  return (
    <Select
      value={ad.status}
      onValueChange={(newStatus: IAd['status']) => onUpdate(ad._id, newStatus)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Set status" />
      </SelectTrigger>
      <SelectContent>
        {statuses.map(status => (
          <SelectItem key={status} value={status} className="capitalize">
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// --- NEW: Flag Ad Dialog ---
const FlagAdDialog: React.FC<{
  ad: IAd;
  apiRoot: string;
  token: string | null;
  onSuccess: () => void;
}> = ({ ad, apiRoot, token, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("A reason is required to flag an ad.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    // From File 9/34: POST /api/admin/ads/:id/flag
    const url = `${apiRoot}/admin/ads/${ad._id}/flag`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to flag ad.');
      
      onSuccess(); // Close dialog and refetch data
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Flag Ad: {ad.title}</DialogTitle>
        <DialogDescription>
          Manually flag this ad for review. This will increment its flag count.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="reason">Reason for Flagging</Label>
          <Textarea 
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Violates content policy..."
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" variant="destructive" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Flag'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};


// --- Main Page Component ---
export default function AdminAdsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  const [ads, setAds] = useState<IAd[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // For status select
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<IAd | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- Fetch Ads ---
  const fetchAds = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    // From File 9/34: GET /api/admin/ads
    const url = `${apiRoot}/admin/ads?page=${page}&limit=20`;
    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: IAdListResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch ads');
      setAds(data.data);
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiRoot, token]); // Added dependencies

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token || user?.role !== 'admin') {
      setError("You must be an admin to view this page.");
      setIsLoading(false);
      return;
    }
    fetchAds(1);
  }, [isAuthLoading, token, user?.role, fetchAds]);

  // --- Handle Status Update ---
  const handleSetStatus = async (adId: string, status: IAd['status']) => {
    setIsUpdating(adId);
    setError(null);
    
    const url = `${apiRoot}/admin/ads/${adId}/status`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: status }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update status.');
      
      setAds(prev => prev.map(ad => 
        ad._id === adId ? { ...ad, status: result.status } : ad
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const openFlagDialog = (ad: IAd) => {
    setSelectedAd(ad);
    setIsFlagDialogOpen(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading all ads...</p>
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No ads found.
                  </TableCell>
                </TableRow>
              )}
              {ads.map((ad) => (
                <TableRow key={ad._id} className={ad.flaggedCount > 0 ? 'bg-red-50' : ''}>
                  <TableCell>
                    <div className="font-medium">{ad.title}</div>
                    <div className="text-xs text-gray-500 capitalize">{ad.type}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ad.owner.name}</div>
                    <div className="text-xs text-gray-500">{ad.owner.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${ad.totalSpent.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">/ ${ad.budget.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ad.flaggedCount > 0 ? "destructive" : "outline"}>
                      {ad.flaggedCount > 0 ? <ShieldAlert className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      {ad.flaggedCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusSelect 
                      ad={ad}
                      onUpdate={handleSetStatus}
                      isLoading={isUpdating === ad._id}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* --- NEW: Flag Button --- */}
                    <Button variant="outline" size="sm" onClick={() => openFlagDialog(ad)}>
                      <Flag className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {/* TODO: Add Pagination Controls */}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Moderate Ads</h1>
      <div className="flex space-x-2">
        <Input placeholder="Search by ad title..." />
        <Button>Search</Button>
      </div>
      
      {/* --- NEW: Dialog Wrapper --- */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        {renderContent()}
        {selectedAd && (
          <FlagAdDialog
            ad={selectedAd}
            apiRoot={apiRoot}
            token={token}
            onSuccess={() => {
              setIsFlagDialogOpen(false);
              fetchAds(pagination.currentPage); // Refetch ads
            }}
          />
        )}
      </Dialog>
    </div>
  );
}