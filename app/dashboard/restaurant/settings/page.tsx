"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// --- Types (from File 5/19: restaurant.model.js) ---
interface IRestaurant {
  _id: string;
  name: string;
  address: string;
  cuisine: string[];
  contact: {
    phone: string;
    email: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  status: 'pending' | 'approved' | 'rejected';
}

// Helper type for the update payload (File 19)
type IRestaurantUpdate = Partial<Pick<IRestaurant, 'name' | 'address' | 'cuisine' | 'contact' | 'location'>>;


// --- Main Page Component ---
export default function RestaurantSettingsPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [lng, setLng] = useState('');
  const [lat, setLat] = useState('');

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch existing restaurant data ---
  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view settings.");
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      // From File 19: GET /api/restaurants/me
      const url = `${apiRoot}/restaurants/me`;
      try {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (!data.success) {
          if(response.status === 404) {
             setError("You must create your restaurant profile first.");
          } else {
            throw new Error(data.message);
          }
          return;
        }
        
        // Populate the form with existing data
        const r = data.data as IRestaurant;
        setRestaurant(r);
        setName(r.name);
        setAddress(r.address);
        setPhone(r.contact.phone);
        setEmail(r.contact.email);
        setCuisine(r.cuisine.join(', '));
        setLng(r.location.coordinates[0].toString());
        setLat(r.location.coordinates[1].toString());

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [apiBaseUrl, isAuthLoading, token]); // Removed apiRoot

  // --- 2. Handle Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const coordinates: [number, number] = [parseFloat(lng), parseFloat(lat)];
    if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      setError("Latitude and Longitude must be valid numbers.");
      setIsSubmitting(false);
      return;
    }

    // Construct the payload based on File 19
    const payload: IRestaurantUpdate = {
      name,
      address,
      contact: { phone, email },
      cuisine: cuisine.split(',').map(c => c.trim()).filter(Boolean),
      location: { type: 'Point', coordinates }
    };

    // From File 19: PUT /api/restaurants/me
    const url = `${apiRoot}/restaurants/me`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update profile.');
      
      setSuccess("Profile updated successfully!");
      setRestaurant(result.data); // Update local state with new data

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
        </div>
      );
    }

    if (error && !restaurant) { // Critical error (e.g., no profile)
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      );
    }
    
    if (!restaurant) {
       return <div className="p-12 text-center text-gray-500">Restaurant profile not found.</div>;
    }

    return (
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
            <CardDescription>Update your public-facing profile details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Input id="address" value={address} onChange={e => setAddress(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine (comma-separated)</Label>
              <Input id="cuisine" value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="e.g., Nigerian, Pizza, Vegan" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g., 6.5244" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g., 3.3792" required />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" /> {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" /> {success}
              </div>
            )}
            <Button type="submit" size="lg" className="text-lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Restaurant Settings</h1>
      {renderContent()}
    </div>
  );
}