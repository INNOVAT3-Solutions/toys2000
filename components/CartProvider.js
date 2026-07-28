'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { snapQuantity } from '@/lib/cart';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const supabase = createBrowserClient();

  const loadCartForUser = useCallback(async (currentUserId) => {
    if (!supabase) { setLoading(false); return; }
    if (!currentUserId) { setCartItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at');

    setCartItems(data ?? []);
    setLoading(false);
  }, [supabase]);

  const fetchCart = useCallback(() => loadCartForUser(userId), [loadCartForUser, userId]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      void loadCartForUser(currentUserId);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCartForUser, supabase]);

  const addToCart = useCallback(async ({ product, quantity }) => {
    if (!supabase) { toast.error('Sign in to add items to your cart.'); return; }
    if (!userId) { toast.error('Sign in to add items to your cart.'); return; }

    const validQty = snapQuantity(quantity, product.minimum_quantity, product.quantity_increment);

    // Check if item already in cart
    const existing = cartItems.find((i) => i.item_id === product.record_id);

    if (existing) {
      const newQty = snapQuantity(existing.quantity + validQty, product.minimum_quantity, product.quantity_increment);
      const { data } = await supabase
        .from('cart_items')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      setCartItems((prev) => prev.map((i) => i.id === existing.id ? data : i));
    } else {
      const row = {
        user_id: userId,
        item_id: product.record_id,
        item_number: product.item_number,
        manufacturer_id: product.manufacturer_id,
        manufacturer_name: product.manufacturer_name,
        name: product.name,
        unit_price: product.unit_price,
        quantity: validQty,
        unit_qty: product.unit_qty,
        minimum_quantity: product.minimum_quantity ?? 1,
        quantity_increment: product.quantity_increment ?? 1,
        primary_image_url: product.primary_image_url,
      };
      const { data } = await supabase.from('cart_items').insert(row).select().single();
      if (data) setCartItems((prev) => [...prev, data]);
    }

    toast.success(`${product.name} added to cart`);
    setCartOpen(true);
  }, [cartItems, supabase, userId]);

  const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
    if (!supabase) return;
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return;

    const validQty = snapQuantity(newQuantity, item.minimum_quantity, item.quantity_increment);

    const { data } = await supabase
      .from('cart_items')
      .update({ quantity: validQty, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select()
      .single();

    if (data) setCartItems((prev) => prev.map((i) => i.id === cartItemId ? data : i));
  }, [cartItems, supabase]);

  const removeFromCart = useCallback(async (cartItemId) => {
    if (!supabase) return;
    await supabase.from('cart_items').delete().eq('id', cartItemId);
    setCartItems((prev) => prev.filter((i) => i.id !== cartItemId));
  }, [supabase]);

  const clearCart = useCallback(async (manufacturerID = null) => {
    if (!supabase) return;
    if (!userId) return;

    let query = supabase.from('cart_items').delete().eq('user_id', userId);
    if (manufacturerID) query = query.eq('manufacturer_id', manufacturerID);

    await query;
    setCartItems((prev) =>
      manufacturerID ? prev.filter((i) => i.manufacturer_id !== manufacturerID) : []
    );
  }, [supabase, userId]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      cartOpen,
      loading,
      setCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refetch: fetchCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
