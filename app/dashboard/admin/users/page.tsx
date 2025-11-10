"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

// --- Types ---
// From File 27: admin.controller.js
interface IAdminCreateResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    email: string;
    role: string;
  };
}

// --- Main Page Component ---
export default function AdminUsersPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading, user } = useAuth();
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- Handle Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("You must be logged in to perform this action.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setFormSuccess(null);

    // From File 29: POST /api/admin/signup
    const url = `${apiRoot}/admin/signup`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password }),
      });

      const result: IAdminCreateResponse = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create admin user.');
      }

      // --- Success! ---
      setFormSuccess(`Admin user ${result.data?.email} created successfully!`);
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Functions ---
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Auth Guard
  if (user?.role !== 'admin') {
    return (
      <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Create New Admin User</CardTitle>
            <CardDescription>
              This will create a new user with 'admin' privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 6 characters)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" /> {error}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" /> {formSuccess}
              </div>
            )}
            <Button type="submit" size="lg" className="text-lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Admin
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}