"use client";

import React from 'react';
import { useAuth } from '../../lib/AuthContext'; // <-- FIXED PATH (2 levels up)
import { BottomNav } from '../../components/BottomNav'; // <-- FIXED PATH (2 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, ArrowRight, ShoppingBag, CreditCard, ClipboardList, Gamepad2, Settings, Shield, Utensils, LayoutDashboard, List } from 'lucide-react'; // Added List

// --- Profile Page Card ---
const ProfileCard: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}> = ({ title, description, icon: Icon, href }) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center space-x-4 pb-4">
        <div className="p-3 bg-indigo-100 rounded-full">
          <Icon className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-gray-600">{description}</p>
      </CardContent>
      <CardContent>
        <Button asChild className="w-full">
          {/* Replaced Link with <a> */}
          <a href={href} className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 h-11 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
            Go <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

// --- Main Profile Page ---
export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="p-8 text-center">
          <CardTitle>Please log in</CardTitle>
          <CardContent>
            <p className="mt-4">You must be logged in to view your profile.</p>
            <Button asChild className="mt-6">
              <a href="/">Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 pb-24">
      {/* --- Page Header --- */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="text-lg text-gray-600">Manage your account and modules.</p>
        </div>
        <Button onClick={logout} variant="outline" className="self-start sm:self-center">
          Log Out
        </Button>
      </div>

      {/* --- Module Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* --- Food Module --- */}
        <ProfileCard
          title="My Food Orders"
          description="Track your food deliveries, see past orders, and manage your reviews."
          icon={ClipboardList}
          href="/profile/orders"
        />

        {/* --- Thrift Module (COMBINED CARD) --- */}
        <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-center space-x-4 pb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <ShoppingBag className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <CardTitle className="text-xl">Thrift Hub</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-gray-600">Track items you've bought, manage items you're selling, or list a new item.</p>
          </CardContent>
          <CardContent className="flex flex-col space-y-3">
            <Button asChild className="w-full">
              <a href="/profile/thrift/orders" className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 h-11 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                My Purchases <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/profile/thrift/dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" /> My Seller Dashboard
              </a>
            </Button>
            {/* --- NEW LINK TO "MY PRODUCTS" --- */}
            <Button asChild variant="outline" className="w-full">
              <a href="/profile/thrift/products">
                <List className="w-4 h-4 mr-2" /> My Products
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a href="/profile/thrift/new">
                + Sell a New Item
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* --- Game Module --- */}
        <ProfileCard
          title="Game History"
          description="View your past game results and see your win/loss record."
          icon={Gamepad2}
          href="/profile/games" // We will build this next
        />

        {/* --- Ad Module (if user or admin) --- */}
        {user.role !== 'restaurant' && (
          <ProfileCard
            title="Ad Manager"
            description="Create new ads, manage your budget, and track performance."
            icon={CreditCard}
            href="/profile/ads"
          />
        )}
        
        {/* --- Restaurant Module (if restaurant) --- */}
        {user.role === 'restaurant' && (
          <ProfileCard
            title="Restaurant Dashboard"
            description="Manage your menu, view incoming orders, and see your analytics."
            icon={Utensils}
            href="/dashboard/restaurant"
          />
        )}

        {/* --- Admin Module (if admin) --- */}
        {user.role === 'admin' && (
          <ProfileCard
            title="Admin Panel"
            description="Manage users, approve restaurants, and moderate ads."
            icon={Shield}
            href="/dashboard/admin" 
          />
        )}
        
        {/* --- General Settings --- */}
        <ProfileCard
          title="Account Settings"
          description="Update your personal information and manage your password."
          icon={Settings}
          href="/profile/settings" // We will build this next
        />
      </div>

      <BottomNav currentPage="profile" />
    </div>
  );
}