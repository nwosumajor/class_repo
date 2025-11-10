"use client";

import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';

// --- 1. CONFIGURATION AND TYPESCRIPT INTERFACES ---

// The Base URL for our Node.js/Express API (from your .env file)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types based on File 1 (User Model) and File 26 (AuthController)
export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'restaurant' | 'admin';
}

export interface IAuthContext {
  isAuthenticated: boolean;
  user: IUser | null;
  token: string | null;
  role: IUser['role'] | null;
  login: (token: string, user: IUser) => void;
  logout: () => void;
  isLoading: boolean;
  // We add the API base URL here for all components to use
  apiBaseUrl: string;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

// --- 2. AUTHENTICATION PROVIDER (Global State) ---

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const apiBaseUrl = API_BASE_URL;

  // Load saved token from localStorage on app start
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('maestro_token');
      const storedUser = localStorage.getItem('maestro_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser)); 
      }
    } catch (error) {
      console.error("Failed to load auth state from localStorage", error);
      localStorage.clear(); 
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login action: saves token and user to state and localStorage
  const login = useCallback((newToken: string, newUser: IUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('maestro_token', newToken);
    localStorage.setItem('maestro_user', JSON.stringify(newUser));
  }, []);

  // Logout action: clears state and localStorage
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('maestro_token');
    localStorage.removeItem('maestro_user');
  }, []);

  // Provide the auth state to all children
  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token && !!user,
      user,
      token,
      role: user?.role || null,
      login,
      logout,
      isLoading,
      apiBaseUrl // Provide the base URL to all components
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 3. CUSTOM HOOK ---
// This is how components will access the auth state
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};