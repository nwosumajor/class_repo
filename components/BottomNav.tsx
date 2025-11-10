"use client";

import React from 'react';
// import Link from 'next/link'; // <-- REMOVED
import { useCart } from '../lib/CartContext'; // <-- FIXED PATH
import { useThriftCart } from '../lib/ThriftCartContext'; // <-- FIXED PATH
import { Home, UtensilsCrossed, ShoppingBag, Gamepad2, User, ShoppingCart } from 'lucide-react';

// Define the routes for your app
type AppRoute = 'home' | 'food' | 'thrift' | 'games' | 'profile' | 'cart';

// Define the icons
const navItems = [
    { label: 'Home', icon: Home, page: 'home', href: '/' },
    { label: 'Food', icon: UtensilsCrossed, page: 'food', href: '/food' },
    { label: 'Thrift', icon: ShoppingBag, page: 'thrift', href: '/thrift' },
    { label: 'Games', icon: Gamepad2, page: 'games', href: '/games' }, // <-- UPDATED LINK
    { label: 'Profile', icon: User, page: 'profile', href: '/profile' }
];

// Helper to get total cart count
const useTotalCartCount = () => {
  const { itemCount: foodCartCount } = useCart();
  const { itemCount: thriftCartCount } = useThriftCart();
  return foodCartCount + thriftCartCount;
};

export const BottomNav: React.FC<{ currentPage: AppRoute }> = ({ currentPage }) => {
    const totalCartCount = useTotalCartCount();

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] md:static md:shadow-none md:border-none md:p-0">
          <div className="grid grid-cols-5 max-w-5xl mx-auto">
              {navItems.map((item) => {
                  const isActive = currentPage === item.page;
                  const Icon = item.icon;
                  const activeClasses = 'text-indigo-600 bg-indigo-50';
                  const inactiveClasses = 'text-gray-500 hover:bg-gray-100';

                  return (
                      <a
                          href={item.href}
                          key={item.page}
                          className={`flex flex-col items-center justify-center p-2 text-xs font-medium rounded-lg transition-colors m-2 ${
                              isActive ? activeClasses : inactiveClasses
                          }`}
                          // Prevent navigation in preview
                          onClick={(e) => {
                            if (window.location.pathname === item.href) e.preventDefault();
                          }}
                      >
                          <Icon className="w-6 h-6" />
                          <span className="mt-1">{item.label}</span>
                      </a>
                  );
              })}
          </div>

          {/* Floating Cart Button - Visible only if items are in either cart */}
          {totalCartCount > 0 && (
            <a 
              href="/cart" // Main food cart, but could be a combined cart page
              className="absolute -top-16 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all md:hidden"
            >
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                  {totalCartCount}
                </span>
            </a>
          )}
      </nav>
    );
};