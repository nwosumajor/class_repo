"use client";

import React, { useState } from 'react';
// 1. Import the shared context hook using a relative path
import { useAuth, IUser } from '../lib/AuthContext';

// 2. Import the shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 3. Import the shared navigation component using a relative path
import { BottomNav } from '../components/BottomNav';
import { Loader2 } from 'lucide-react';

// --- LOGIN FORM COMPONENT ---
function LoginForm() {
  const { login, apiBaseUrl } = useAuth(); // Get login and apiBaseUrl from context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Use the correct API path from File 8 and 61
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed.');
      }
      login(data.data.token, data.data); // Call global login
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          required placeholder="user@maestro.com"
        />
      </div>
      <div>
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full text-lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Maestro'}
      </Button>
    </form>
  );
}

// --- REGISTER FORM COMPONENT ---
function RegisterForm({ onRegisterSuccess }: { onRegisterSuccess: (message: string) => void }) {
  const { apiBaseUrl } = useAuth(); // Get apiBaseUrl from context
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Logic from File 26: role defaults to 'user' unless specified
  const [role, setRole] = useState<'user' | 'restaurant'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Use the correct API path from File 8 and 61
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }
      onRegisterSuccess(data.message || 'Registration successful! Please log in.');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="reg-name">Name</Label>
        <Input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nwosu Ayodele" />
      </div>
      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="new.user@maestro.com" />
      </div>
      <div>
        <Label htmlFor="reg-password">Password (min 6 characters)</Label>
        <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>I am signing up as:</Label>
        <Tabs defaultValue="user" onValueChange={(value) => setRole(value as 'user' | 'restaurant')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">Customer</TabsTrigger>
            <TabsTrigger value="restaurant">Restaurant Owner</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-gray-500 pt-1">
          {role === 'restaurant' ? 'You will need to register your restaurant profile next.' : 'Standard customer access.'}
        </p>
      </div>
      <Button type="submit" className="w-full text-lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Account'}
      </Button>
    </form>
  );
}

// --- MAIN AUTH WRAPPER ---
function AuthWrapper() {
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");

  const handleRegisterSuccess = (msg: string) => {
    setMessage(msg);
    setActiveTab("login"); // Switch to login tab
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader>
          <CardTitle>Maestro: Unified Platform</CardTitle>
          <p className="text-gray-500 mt-1 text-base">Access Food Ordering, Thrift Marketplace, and Gaming.</p>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="p-3 mb-4 bg-green-100 text-green-700 border border-green-300 rounded-lg text-sm font-medium">
              {message}
            </div>
          )}
          {/* By controlling the value prop, we can switch tabs programmatically */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// --- HOME DASHBOARD ---
function Dashboard() {
  const { user, logout, role } = useAuth();

  return (
    // Add padding-bottom to prevent mobile nav from covering content
    <div className="p-4 sm:p-8 space-y-6 pb-24 md:pb-8"> 
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-indigo-700 mb-4 md:mb-0">Maestro</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700 text-right">
            <div className="font-semibold text-gray-900">{user?.name}</div>
            <div className="text-xs text-indigo-600 font-medium capitalize">{role} Account</div>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 bg-white px-3 py-1 text-sm font-medium"
          >
            Logout
          </Button>
        </div>
      </div>
      
      {/* Home Content */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}!</h2>
        <p className="text-base text-gray-600 mt-2">Your current access role is: <span className="font-extrabold capitalize text-indigo-600">{role}</span>.</p>
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="font-semibold text-indigo-800">Authentication Layer is Operational!</p>
          <p className="text-sm text-indigo-700 mt-1">
            Select a module from the navigation bar below to get started.
          </p>
        </div>
      </Card>

      {/* Shared Navigation */}
      <BottomNav currentPage="home" />
    </div>
  );
}

// --- APP GATE ---
// This component decides whether to show the Login forms or the Dashboard
function AppGate() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }
  
  return <AuthWrapper />;
}

// --- DEFAULT EXPORT ---
// This is the component that Next.js will render for this page
export default function Home() {
  return <AppGate />;
}