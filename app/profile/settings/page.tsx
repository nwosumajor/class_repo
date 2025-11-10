"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import { BottomNav } from '@/components/BottomNav'; // <-- Using @/ alias
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, KeyRound, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// --- Types (from authController.js) ---
interface IProfileUpdateResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'restaurant' | 'admin';
    token: string;
  };
}

/**
 * --- Profile Details Form ---
 */
const ProfileForm: React.FC = () => {
  const { user, token, apiBaseUrl, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // From authRoutes.js: PUT /api/auth/me
    const url = `${apiBaseUrl.replace('/auth', '')}/auth/me`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email }),
      });

      const result: IProfileUpdateResponse = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update profile.');

      // SUCCESS! Re-log the user in with the new data and token
      login(result.data.token, {
        _id: result.data._id,
        name: result.data.name,
        email: result.data.email,
        role: result.data.role,
      });
      setSuccess('Profile updated successfully!');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your public name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" /> {success}
            </div>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Profile'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

/**
 * --- Change Password Form ---
 */
const PasswordForm: React.FC = () => {
  const { token, apiBaseUrl, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // From authRoutes.js: PUT /api/auth/changepassword
    const url = `${apiBaseUrl.replace('/auth', '')}/auth/changepassword`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result: IProfileUpdateResponse = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to change password.');

      // SUCCESS! Re-log the user in with the new token
      login(result.data.token, {
        _id: result.data._id,
        name: result.data.name,
        email: result.data.email,
        role: result.data.role,
      });
      setSuccess('Password changed successfully!');
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password. You will be logged out of other sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password (min 6 characters)</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" /> {success}
            </div>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set New Password'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};


/**
 * --- Main Page Component ---
 */
export default function AccountSettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-12">
        <Card className="text-center p-8">
          <CardTitle>Access Denied</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p>You must be logged in to view settings.</p>
            <Button asChild>
              <a href="/">Login</a>
            </Button>
          </CardContent>
        </Card>
        <BottomNav currentPage="profile" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* --- Header --- */}
      <div className="flex items-center space-x-2 mb-6">
        <Button asChild variant="outline" size="icon">
          <a href="/profile"><ArrowLeft className="h-4 w-4" /></a>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
      </div>

      <div className="space-y-8">
        <ProfileForm />
        <PasswordForm />
      </div>

      <BottomNav currentPage="profile" />
    </div>
  );
}