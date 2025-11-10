"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext'; // <-- FIXED PATH (4 levels up)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Utensils } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
    AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// --- Types (from File 2: menuItem.model.js) ---
interface IMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  tags: string[];
}

// --- Helper: Menu Form (for Create/Edit) ---
const MenuItemForm: React.FC<{
  item?: IMenuItem | null; // Pass item to pre-fill for editing
  onSave: (itemData: Partial<IMenuItem>) => void;
  isLoading: boolean;
}> = ({ item, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    price: item?.price || 0,
    description: item?.description || '',
    tags: item?.tags?.join(', ') || '', // Convert array to comma-separated string for input
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemData: Partial<IMenuItem> = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean), // Convert back to array
    };
    onSave(itemData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="price">Price ($)</Label>
        <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleChange} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., popular, spicy, vegan" />
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Item'}
        </Button>
      </DialogFooter>
    </form>
  );
};


// --- Main Page Component ---
export default function RestaurantMenuPage() {
  const { token, apiBaseUrl, isLoading: isAuthLoading } = useAuth();
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // For toggling
  const [isSubmitting, setIsSubmitting] = useState(false); // For form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IMenuItem | null>(null);

  const apiRoot = apiBaseUrl.replace('/auth', '');

  // --- 1. Fetch All Menu Items ---
  const fetchMenu = async () => {
    setIsLoading(true);
    setError(null);
    
    // From File 14: GET /api/menus/me
    const url = `${apiRoot}/menus/me`;

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      setMenuItems(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) {
      setIsLoading(false);
      setError("You must be logged in to view your menu.");
      return;
    }
    fetchMenu();
  }, [apiBaseUrl, isAuthLoading, token]); // Removed fetchMenu from dependencies

  // --- 2. Handle Create / Update ---
  const handleSaveItem = async (itemData: Partial<IMenuItem>) => {
    setIsSubmitting(true);
    setError(null);

    const isEdit = !!editingItem;
    const url = isEdit ? `${apiRoot}/menus/${editingItem._id}` : `${apiRoot}/menus`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to save item.');

      if (isEdit) {
        // Find and update item in state
        setMenuItems(prev => prev.map(item => item._id === editingItem._id ? result.data : item));
      } else {
        // Add new item to state
        setMenuItems(prev => [result.data, ...prev]);
      }
      
      setDialogOpen(false); // Close dialog on success
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message); // Show error inside the dialog
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. Handle Toggle Availability ---
  const handleToggle = async (itemId: string, currentAvailability: boolean) => {
    setIsUpdating(itemId);
    
    // From File 14: POST /api/menus/:itemId/toggle
    const url = `${apiRoot}/menus/${itemId}/toggle`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to toggle.');

      // Update state
      setMenuItems(prev => prev.map(item => 
        item._id === itemId ? { ...item, available: result.available } : item
      ));
    } catch (err: any) {
      setError(err.message); // Show error on page
    } finally {
      setIsUpdating(null);
    }
  };
  
  // --- 4. Handle Delete (Bonus) ---
  const handleDelete = async (itemId: string) => {
    // Note: You must be inside an <AlertDialog> to call this
    setIsUpdating(itemId);
    // From File 14: DELETE /api/menus/:itemId
    const url = `${apiRoot}/menus/${itemId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete.');
      
      // Remove from state
      setMenuItems(prev => prev.filter(item => item._id !== itemId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setError(null);
    setDialogOpen(true);
  };
  
  const openEditDialog = (item: IMenuItem) => {
    setEditingItem(item);
    setError(null);
    setDialogOpen(true);
  };

  // --- Render Functions ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-12">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-500">Loading your menu...</p>
        </div>
      );
    }

    if (error && !dialogOpen) { // Only show page error if dialog is closed
      return (
        <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
          {error}
        </div>
      );
    }

    if (menuItems.length === 0) {
      return (
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">No Menu Items Found</h3>
          <p className="text-gray-500 mt-2">Click "Add New Item" to build your menu.</p>
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Available</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <Switch
                      checked={item.available}
                      onCheckedChange={() => handleToggle(item._id, item.available)}
                      disabled={isUpdating === item._id}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                  </TableCell>
                  <TableCell className="font-medium">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isUpdating === item._id}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item._id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Manage Menu</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
              <DialogDescription>
                Fill in the details for your menu item.
              </DialogDescription>
            </DialogHeader>
            {error && dialogOpen && (
              <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            <MenuItemForm
              item={editingItem}
              onSave={handleSaveItem}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {renderContent()}
    </div>
  );
}