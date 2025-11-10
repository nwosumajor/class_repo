"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { BottomNav } from '@/components/BottomNav'; // <-- Using @/ alias
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, PieChart, Eye, MousePointerClick, CheckSquare, DollarSign, PauseCircle, PlayCircle, Trash2, ShieldAlert, Calendar, Zap, Edit } from 'lucide-react'; // <-- NEW: Added Edit
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
import { Badge } from '@/components/ui/badge';
import { loadStripe, Stripe, StripeCardElementOptions } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// --- Types ---
interface IAdPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cvr: number;
  spend: number;
}
interface IAd {
  _id: string;
  title: string;
  status: 'active' | 'paused' | 'expired' | 'draft' | 'completed' | 'rejected';
  budget: number;
  flaggedCount: number;
  endDate?: string;
}

// --- Stripe Setup ---
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');
const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: { color: "#32325d", fontSize: "16px", "::placeholder": { color: "#aab7c4" } },
    invalid: { color: "#fa755a", iconColor: "#fa755a" },
  },
};

// --- Helper: Stat Card ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      <Icon className="h-5 w-5 text-gray-400" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </CardContent>
  </Card>
);

// --- Boost Budget Dialog ---
const BoostBudgetDialog: React.FC<{ 
  ad: IAd;
  apiRoot: string;
  token: string | null;
  onSuccess: (newAdData: IAd) => void; 
}> = ({ ad, apiRoot, token, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Payment system not ready."); return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found."); return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card', card: cardElement,
      });
      if (pmError) throw new Error(pmError.message || "Payment method failed.");

      const url = `${apiRoot}/ads/${ad._id}/boost`;
      const body = {
        amount,
        payment: {
          method: 'stripe',
          data: { payment_method_id: paymentMethod.id }
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to boost budget.');

      onSuccess(result.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Boost Budget for "{ad.title}"</DialogTitle>
        <DialogDescription>
          Add more funds to your ad campaign to extend its reach.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="amount">Boost Amount ($)</Label>
          <Input 
            id="amount" 
            type="number" 
            min="5" 
            value={amount} 
            onChange={(e) => setAmount(Number(e.target.value))} 
          />
        </div>
        <div>
          <Label>Payment Card</Label>
          <div className="p-3 border rounded-lg bg-white">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" disabled={!stripe || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay $${amount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

// --- Extend Duration Dialog ---
const ExtendDurationDialog: React.FC<{
  ad: IAd;
  apiRoot: string;
  token: string | null;
  onSuccess: (newAdData: IAd) => void;
}> = ({ ad, apiRoot, token, onSuccess }) => {
  const [endDate, setEndDate] = useState(ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const url = `${apiRoot}/ads/${ad._id}/extend`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ endDate: new Date(endDate).toISOString() }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to extend duration.');
      
      onSuccess(result.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Extend Campaign Duration</DialogTitle>
        <DialogDescription>
          Set a new end date for your ad campaign.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="endDate">New End Date</Label>
          <Input 
            id="endDate" 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save New Date'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};


// --- Main Page Component ---
export default function AdAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();

  const adId = params.adId as string;

  const [ad, setAd] = useState<IAd | null>(null);
  const [performance, setPerformance] = useState<IAdPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [isBoostOpen, setIsBoostOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  
  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- Fetch Initial Data ---
  const fetchData = useCallback(async () => {
    if (isAuthLoading || !adId || !token) {
      setIsLoading(false);
      setError("You must be logged in to view ad stats.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const adUrl = `${apiRoot}/ads/${adId}`;
      const perfUrl = `${apiRoot}/ads/${adId}/performance`;

      const [adRes, perfRes] = await Promise.all([
        fetch(adUrl, { headers }),
        fetch(perfUrl, { headers })
      ]);

      const adData = await adRes.json();
      if (!adData.success) throw new Error(adData.message || 'Failed to load ad');
      setAd(adData.data);

      const perfData = await perfRes.json();
      if (!perfData.success) throw new Error(perfData.message || 'Failed to load performance');
      setPerformance(perfData.data);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiRoot, adId, isAuthLoading, token]);

  useEffect(() => {
    if(adId) {
      fetchData();
    }
  }, [fetchData, adId]);

  // --- Handle Ad Status Update (Pause/Resume) ---
  const handleUpdateStatus = async (action: 'pause' | 'resume') => {
    setIsUpdating(true);
    setActionError(null);
    const url = `${apiRoot}/ads/${adId}/${action}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || `Failed to ${action} ad.`);
      setAd(prevAd => prevAd ? { ...prevAd, status: result.status } : null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Handle Ad Deletion ---
  const handleDelete = async () => {
    setIsUpdating(true);
    setActionError(null);
    const url = `${apiRoot}/ads/${adId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete ad.');
      router.push('/profile/ads');
    } catch (err: any) {
      setActionError(err.message);
      setIsUpdating(false);
    }
  };

  // --- Render Functions ---
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
    
    if (!ad || !performance) {
      return <div className="p-12 text-center text-gray-500">Ad data not found.</div>;
    }
    
    const cpc = performance.clicks ? (performance.spend / performance.clicks) : 0;
    const cpa = performance.conversions ? (performance.spend / performance.conversions) : 0;

    return (
      <div className="space-y-6">
        {/* --- Action/Status Bar --- */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-lg">Status:</span>
              <Badge className="text-base capitalize" variant={ad.status === 'active' ? 'default' : 'secondary'}>
                {ad.status}
              </Badge>
              {ad.flaggedCount > 0 && (
                <Badge variant="destructive">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Flagged ({ad.flaggedCount})
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* --- NEW EDIT BUTTON --- */}
              <Button asChild variant="outline">
                <Link href={`/profile/ads/edit/${ad._id}`}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Ad
                </Link>
              </Button>
            
              {ad.status === 'active' && (
                <Button variant="outline" onClick={() => handleUpdateStatus('pause')} disabled={isUpdating}>
                  <PauseCircle className="h-4 w-4 mr-2" /> Pause Ad
                </Button>
              )}
              {ad.status === 'paused' && (
                <Button variant="outline" onClick={() => handleUpdateStatus('resume')} disabled={isUpdating}>
                  <PlayCircle className="h-4 w-4 mr-2" /> Resume Ad
                </Button>
              )}
              
              <Dialog open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Zap className="h-4 w-4 mr-2" /> Boost Budget</Button>
                </DialogTrigger>
                <Elements stripe={stripePromise}>
                  <BoostBudgetDialog 
                    ad={ad} 
                    apiRoot={apiRoot} 
                    token={token} 
                    onSuccess={(updatedAd) => {
                      setAd(updatedAd);
                      fetchData();
                      setIsBoostOpen(false);
                    }} 
                  />
                </Elements>
              </Dialog>
              
              <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Calendar className="h-4 w-4 mr-2" /> Extend</Button>
                </DialogTrigger>
                <ExtendDurationDialog
                  ad={ad}
                  apiRoot={apiRoot}
                  token={token}
                  onSuccess={(updatedAd) => {
                    setAd(updatedAd);
                    setIsExtendOpen(false);
                  }}
                />
              </Dialog>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isUpdating}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{ad.title}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Yes, Delete Ad
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
          {actionError && (
            <div className="p-4 pt-0 text-red-600 text-sm font-medium">
              {actionError}
            </div>
          )}
        </Card>
      
        {/* --- Stat Cards --- */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Impressions" value={performance.impressions.toLocaleString()} icon={Eye} />
          <StatCard title="Clicks" value={performance.clicks.toLocaleString()} icon={MousePointerClick} />
          <StatCard title="Conversions" value={performance.conversions.toLocaleString()} icon={CheckSquare} />
          <StatCard title="Total Spend" value={`$${performance.spend.toFixed(2)}`} icon={DollarSign} />
        </div>
        
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          <StatCard title="Click-Through (CTR)" value={`${(performance.ctr * 100).toFixed(2)}%`} icon={PieChart} />
          <StatCard title="Cost Per Click (CPC)" value={`$${cpc.toFixed(2)}`} icon={PieChart} />
          <StatCard title="Cost Per Acq. (CPA)" value={`$${cpa.toFixed(2)}`} icon={PieChart} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link href="/profile/ads"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{ad?.title || 'Ad Analytics'}</h1>
        </div>
      </div>

      {renderContent()}

      <BottomNav currentPage="profile" />
    </div>
  );
}