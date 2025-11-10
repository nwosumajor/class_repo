"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// --- 1. Typescript Interfaces ---

// Interface for a single item in the cart
export interface ICartItem {
  itemId: string;        // The MenuItem._id
  name: string;
  price: number;
  qty: number;
  restaurantId: string;  // ID of the restaurant this item is from
  restaurantName: string;// Name of the restaurant
}

// Interface for the Cart Context state
export interface ICartContext {
  items: ICartItem[];
  itemCount: number;
  cartTotal: number;
  currentRestaurantId: string | null;
  addItem: (item: Omit<ICartItem, 'qty'>) => void;
  removeItem: (itemId: string) => void;
  updateItemQty: (itemId: string, newQty: number) => void;
  clearCart: () => void;
}

// Create the context
export const CartContext = createContext<ICartContext | undefined>(undefined);

// --- 2. Cart Provider Component ---

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ICartItem[]>([]);

  // Derived state: Automatically calculated from 'items'
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const currentRestaurantId = items.length > 0 ? items[0].restaurantId : null;

  /**
   * Adds an item to the cart.
   * If the item is from a different restaurant, it clears the old cart first.
   */
  const addItem = (itemToAdd: Omit<ICartItem, 'qty'>) => {
    setItems(prevItems => {
      // Check if this item is from a new restaurant
      const isNewRestaurant = prevItems.length > 0 && prevItems[0].restaurantId !== itemToAdd.restaurantId;

      if (isNewRestaurant) {
        // New restaurant: Clear the cart and add this as the first item
        console.log("New restaurant detected, clearing old cart.");
        return [{ ...itemToAdd, qty: 1 }];
      }

      // Same restaurant (or empty cart): Find if item already exists
      const existingItem = prevItems.find(item => item.itemId === itemToAdd.itemId);

      if (existingItem) {
        // Item exists: Increment quantity
        return prevItems.map(item =>
          item.itemId === itemToAdd.itemId ? { ...item, qty: item.qty + 1 } : item
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
  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.itemId !== itemId));
  };

  /**
   * Updates an item's quantity. If qty is 0, removes the item.
   */
  const updateItemQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      // Quantity is 0 or less, remove the item
      removeItem(itemId);
    } else {
      // Update the quantity for the specific item
      setItems(prevItems =>
        prevItems.map(item =>
          item.itemId === itemId ? { ...item, qty: newQty } : item
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
    <CartContext.Provider
      value={{
        items,
        itemCount,
        cartTotal,
        currentRestaurantId,
        addItem,
        removeItem,
        updateItemQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// --- 3. Custom Hook ---

/**
 * Custom hook to easily access the CartContext.
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};