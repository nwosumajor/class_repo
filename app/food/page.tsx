"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
// import Link from 'next/link'; // <--- 1. IMPORT LINK (Removed to fix build error)
// import { useAuth } from '../../lib/AuthContext'; (Removed to fix build error)
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// import { BottomNav } from '../../components/BottomNav'; (Removed to fix build error)
import { Search, MapPin, Star, Utensils, Loader2, Home, UtensilsCrossed, Gamepad2, User } from 'lucide-react';

// --- INLINED AuthContext ---
// Types based on File 1 (User Model) and File 26 (AuthController)
interface IUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'restaurant' | 'admin';
}
interface IAuthContext {
  isAuthenticated: boolean;
  user: IUser | null;
  token: string | null;
  role: IUser['role'] | null;
  apiBaseUrl: string; // Added for fetching
  login: (token: string, user: IUser) => void;
  logout: () => void;
  isLoading: boolean;
}
const AuthContext = createContext<IAuthContext | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  // Provide default values for the preview environment
  if (context === undefined) {
    console.warn("useAuth used outside of provider, using mock data for preview.");
    return {
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
        apiBaseUrl: 'http://localhost:5000/api/auth',
        login: () => {},
        logout: () => {},
        isLoading: false,
    }
  }
  return context;
};
// --- END INLINED AuthContext ---

// --- INLINED BottomNav ---
type PageName = 'home' | 'food' | 'thrift' | 'games' | 'profile';
const navItems: { name: PageName; label: string; icon: React.ElementType; href: string }[] = [
    { name: 'home', label: 'Home', icon: Home, href: '/' },
    { name: 'food', label: 'Food', icon: UtensilsCrossed, href: '/food' },
    { name: 'thrift', label: 'Thrift', icon: Gamepad2, href: '/thrift' }, // Placeholder icon
    { name: 'games', label: 'Games', icon: Gamepad2, href: '/games' },
    { name: 'profile', label: 'Profile', icon: User, href: '/profile' },
];
const BottomNav: React.FC<{ currentPage: PageName }> = ({ currentPage }) => {
    return (
        <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200">
            <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
                {navItems.map((item) => {
                    const isActive = item.name === currentPage;
                    return (
                        <a // Using <a> instead of <Link> for preview
                            key={item.label}
                            href={item.href}
                            onClick={(e) => e.preventDefault()} // Prevent real navigation in preview
                            className={`inline-flex flex-col items-center justify-center px-5 group ${
                                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-900'}`} />
                            <span className="text-xs">{item.label}</span>
                        </a>
                    );
                })}
            </div>
        </nav>
    );
};
// --- END INLINED BottomNav ---


// --- 1. TYPESCRIPT INTERFACES ---
interface IRestaurant {
    _id: string;
    name: string;
    cuisine: string[];
    address: string;
    avgRating: number;
    dist?: { calculated: number }; 
}

// --- 2. DATA FETCHING LOGIC ---
const fetchRestaurants = async (apiBaseUrl: string, query: string, location: { lat: number, lng: number } | null): Promise<IRestaurant[]> => {
    // Use the apiBaseUrl from context, but remove '/auth'
    const searchUrl = `${apiBaseUrl.replace('/auth', '')}/restaurants/search`;
    
    // Build query params
    const params = new URLSearchParams();
    params.append('q', query);
    if (location) {
        params.append('lat', location.lat.toString());
        params.append('lng', location.lng.toString());
    }

    const response = await fetch(`${searchUrl}?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
    }
    const data = await response.json();
    return data.data;
};

// --- 3. RESTAURANT CARD COMPONENT (NOW WRAPPED IN <a>) ---
const RestaurantCard: React.FC<{ restaurant: IRestaurant }> = ({ restaurant }) => {
    const formatDistance = (m: number) => (m / 1000).toFixed(1) + ' km';

    // 2. CREATE THE DYNAMIC HREF
    const restaurantHref = `/food/${restaurant._id}?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}`;

    return (
        // 3. WRAP THE CARD IN A <a> tag
        <a href={restaurantHref} onClick={(e) => e.preventDefault()} className="block group">
            <Card className="overflow-hidden h-full flex flex-col transition-all duration-200 group-hover:shadow-xl group-hover:border-indigo-300">
                {/* Image Placeholder */}
                <div className="h-32 bg-gray-200 flex items-center justify-center">
                    <Utensils className="h-12 w-12 text-gray-400" />
                </div>
                
                {/* Card Content */}
                <CardContent className="p-4 flex-grow">
                    <h3 className="text-xl font-semibold mb-1">{restaurant.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 truncate">{restaurant.cuisine.join(', ')}</p>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400" />
                        {restaurant.avgRating.toFixed(1)}
                    </div>
                    
                    {restaurant.dist?.calculated && (
                        <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            {formatDistance(restaurant.dist.calculated)}
                        </div>
                    )}
                </CardContent>
                
                {/* Footer Call-to-Action */}
                <div className="p-3 bg-indigo-50 text-center text-indigo-700 font-medium text-sm transition-colors group-hover:bg-indigo-100">
                    View Menu & Order
                </div>
            </Card>
        </a>
    );
};

// --- 4. MAIN PAGE COMPONENT (No changes needed here) ---
export default function FoodDiscoveryPage() {
    const { role, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Get user's location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn("User denied location access.")
            );
        }
    }, []);

    // Fetch restaurant data
    useEffect(() => {
        if (isAuthLoading) return; // Wait for auth to be ready
        
        setIsLoading(true);
        fetchRestaurants(apiBaseUrl, searchQuery, location)
            .then(setRestaurants)
            .catch(err => setError(err.message))
            .finally(() => setIsLoading(false));
    }, [searchQuery, location, apiBaseUrl, isAuthLoading]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchTerm);
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 pb-24">
            <h2 className="text-3xl font-bold text-indigo-700 mb-6">Local Food Hub 🍔</h2>

            {role === 'restaurant' && (
                <Card className="mb-8 border-indigo-200 bg-indigo-50">
                    <CardContent className="p-4">
                        <h3 className="text-lg font-semibold text-indigo-800">Restaurant Owner Dashboard</h3>
                        <p className="text-indigo-700 text-sm mt-1">Manage your menu, view orders, and see analytics.</p>
                        <Button size="sm" className="mt-3">Go to Dashboard</Button>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSearchSubmit} className="flex space-x-2 mb-8">
                <Input
                    type="text"
                    placeholder="Search for food or restaurants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow"
                />
                <Button type="submit" disabled={!location}>
                    <Search className="h-4 w-4 mr-0 sm:mr-2" />
                    <span className="hidden sm:inline">Search</span>
                </Button>
            </form>

            {/* Main Content Area */}
            {isLoading && (
                <div className="flex justify-center mt-12">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
            )}
            
            {!isLoading && error && <p className="text-red-600 text-center">{error}</p>}
            
            {!isLoading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {restaurants.map(r => (
                        <RestaurantCard key={r._id} restaurant={r} />
                    ))}
                </div>
            )}
            
            {/* Shared Navigation */}
            <BottomNav currentPage="food" />
        </div>
    );
}