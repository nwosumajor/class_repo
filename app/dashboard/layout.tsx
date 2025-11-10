"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; // <-- Using @/ alias
import Link from 'next/link'; 
import { usePathname, useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Home,
  Utensils,
  ClipboardList,
  Menu,
  LogOut,
  Loader2,
  PieChart,
  Shield,
  ShoppingBag,
  User, 
  Settings, 
  CheckCircle, 
  Tag,
  MessageSquareWarning,
  UserPlus // <-- NEW
} from 'lucide-react';

// --- Types ---
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  role: 'restaurant' | 'admin' | 'all';
};

// --- Sidebar Navigation Items (UPDATED) ---
const navItems: NavItem[] = [
  // Restaurant
  { href: '/dashboard/restaurant', label: 'Overview', icon: Home, role: 'restaurant' },
  { href: '/dashboard/restaurant/orders', label: 'Orders', icon: ClipboardList, role: 'restaurant' },
  { href: '/dashboard/restaurant/menu', label: 'Menu Items', icon: Utensils, role: 'restaurant' },
  { href: '/dashboard/restaurant/offers', label: 'Offers', icon: Tag, role: 'restaurant' },
  { href: '/dashboard/restaurant/analytics', label: 'Analytics', icon: PieChart, role: 'restaurant' },
  { href: '/dashboard/restaurant/settings', label: 'Settings', icon: Settings, role: 'restaurant' },
  
  // Admin
  { href: '/dashboard/admin', label: 'Admin Overview', icon: PieChart, role: 'admin' },
  { href: '/dashboard/admin/restaurants', label: 'Approve Restaurants', icon: CheckCircle, role: 'admin' },
  { href: '/dashboard/admin/ads', label: 'Moderate Ads', icon: Shield, role: 'admin' },
  { href: '/dashboard/admin/reviews', label: 'Moderate Reviews', icon: MessageSquareWarning, role: 'admin' },
  { href: '/dashboard/admin/users', label: 'User Management', icon: UserPlus, role: 'admin' }, // <-- NEW
  
  // All
  { href: '/profile', label: 'Back to Profile', icon: User, role: 'all' },
];

// --- Sidebar Navigation Component ---
const DashboardNav: React.FC<{ userRole: 'restaurant' | 'admin' | 'user' }> = ({ userRole }) => {
  const pathname = usePathname();

  const getFilteredNavItems = () => {
    return navItems.filter(item => item.role === userRole || item.role === 'all');
  };

  return (
    <nav className="flex flex-col space-y-2">
      {getFilteredNavItems().map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? 'default' : 'ghost'}
            className="justify-start text-base"
          >
            <Link href={item.href}>
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
};

// --- Main Layout Component ---
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || (user.role !== 'restaurant' && user.role !== 'admin')) {
    // This user shouldn't be here. Redirect to profile.
    useEffect(() => { router.push('/profile'); }, [router]);
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="ml-4">Redirecting...</p>
      </div>
    );
  }

  const userRole = user.role;
  const currentLabel = navItems.find(item => item.href === pathname)?.label || 'Dashboard';

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden border-r bg-gray-100/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-4">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/profile" className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-6 w-6 text-indigo-700" />
              <span>Maestro Dashboard</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2 px-4">
            <DashboardNav userRole={userRole} />
          </div>
          <div className="mt-auto p-4 border-t">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </aside>

      {/* --- Mobile Header & Main Content --- */}
      <div className="flex flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-gray-100/40 px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="/profile" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <ShoppingBag className="h-6 w-6 text-indigo-700" />
                  <span>Maestro Dashboard</span>
                </Link>
                <DashboardNav userRole={userRole} />
              </nav>
              <div className="mt-auto p-4">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1">
             <h1 className="font-semibold text-xl">
               {currentLabel}
             </h1>
          </div>
        </header>

        {/* --- Main Content --- */}
        <main className="flex-1 p-4 sm:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}