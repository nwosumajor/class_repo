"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// --- 1. Typescript Interfaces ---
// Based on File 32: models/product.js
export interface IThriftCartItem {
  productId: string; // The Product._id
  name: string;
  price: number;
  image: string | null;
  sellerId: string;
  qty: number;
}

// Interface for the Cart Context state
export interface IThriftCartContext {
  items: IThriftCartItem[];
  itemCount: number;
  cartTotal: number;
  addItem: (item: Omit<IThriftCartItem, 'qty'>) => void;
  removeItem: (productId: string) => void;
  updateItemQty: (productId: string, newQty: number) => void;
  clearCart: () => void;
}

// Create the context
export const ThriftCartContext = createContext<IThriftCartContext | undefined>(undefined);

// --- 2. Cart Provider Component ---
export const ThriftCartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<IThriftCartItem[]>([]);

  // On component mount, load the cart from localStorage
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('maestro_thrift_cart');
      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load thrift cart from localStorage", error);
      localStorage.removeItem('maestro_thrift_cart');
    }
  }, []);

  // When 'items' change, save them to localStorage
  useEffect(() => {
    localStorage.setItem('maestro_thrift_cart', JSON.stringify(items));
  }, [items]);

  // Derived state: Automatically calculated from 'items'
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  /**
   * Adds an item to the cart.
   */
  const addItem = (itemToAdd: Omit<IThriftCartItem, 'qty'>) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === itemToAdd.productId);

      if (existingItem) {
        // Item exists: Increment quantity
        return prevItems.map(item =>
          item.productId === itemToAdd.productId ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        // New item: Add to cart with quantity 1
        return [...prevItems, { ...itemToAdd, qty: 1 }];
      }
    });
  };

  /**
   * Removes an item from the cart completely.
   */
  const removeItem = (productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.productId !== productId));
  };

  /**
   * Updates an item's quantity. If qty is 0, removes the item.
   */
  const updateItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      // Quantity is 0 or less, remove the item
      removeItem(productId);
    } else {
      // Update the quantity for the specific item
      setItems(prevItems =>
        prevItems.map(item =>
          item.productId === productId ? { ...item, qty: newQty } : item
        )
      );
    }
  };

  /**
   * Clears all items from the cart.
   */
  const clearCart = () => {
    setItems([]);
  };

  return (
    <ThriftCartContext.Provider
      value={{
        items,
        itemCount,
        cartTotal,
        addItem,
        removeItem,
        updateItemQty,
        clearCart,
      }}
    >
      {children}
    </ThriftCartContext.Provider>
  );
};

// --- 3. Custom Hook ---
/**
 * Custom hook to easily access the ThriftCartContext.
 */
export const useThriftCart = () => {
  const context = useContext(ThriftCartContext);
  if (context === undefined) {
    throw new Error('useThriftCart must be used within a ThriftCartProvider');
  }
  return context;
};