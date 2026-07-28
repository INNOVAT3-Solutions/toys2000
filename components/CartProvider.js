'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { snapQuantity } from '@/lib/cart';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

async function fetchLiveSnapshot(itemID) {
  const res = await fetch(`/api/markettime/items/live?id=${encodeURIComponent(itemID)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load live MarketTime pricing');
  return data.item;
}

async function fetchLiveSnapshots(itemIDs) {
  const res = await fetch('/api/markettime/items/live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIDs }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not refresh live MarketTime pricing');
  return data.items ?? {};
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [liveByItemId, setLiveByItemId] = useState({});
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const supabase = createBrowserClient();
  const liveRefreshInFlight = useRef(null);

  const loadCartForUser = useCallback(async (currentUserId) => {
    if (!supabase) { setLoading(false); return; }
    if (!currentUserId) {
      setCartItems([]);
      setLiveByItemId({});
      setLoading(false);
      return;
    }

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

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUserId = session?.user?.id ?? null;
      setUserId(currentUserId);
      // Skip TOKEN_REFRESHED — reloading the cart on every refresh hammers Auth/DB
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED'
      ) {
        void loadCartForUser(currentUserId);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCartForUser, supabase]);

  const refreshLivePricing = useCallback(async (itemIds = null) => {
    const ids = (itemIds ?? cartItems.map((item) => item.item_id))
      .map((id) => String(id))
      .filter(Boolean);

    if (!ids.length) {
      setLiveByItemId({});
      return {};
    }

    if (liveRefreshInFlight.current) {
      return liveRefreshInFlight.current;
    }

    setLiveRefreshing(true);
    const request = (async () => {
      try {
        const items = await fetchLiveSnapshots(ids);
        setLiveByItemId((prev) => ({ ...prev, ...items }));

        // Persist live unit prices onto cart rows when they change
        if (supabase) {
          await Promise.all(
            cartItems.map(async (item) => {
              const live = items[String(item.item_id)];
              if (!live || live.error || live.unitPrice == null) return;
              if (Number(item.unit_price) === Number(live.unitPrice)) return;

              const { data } = await supabase
                .from('cart_items')
                .update({
                  unit_price: live.unitPrice,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id)
                .select()
                .single();

              if (data) {
                setCartItems((prev) => prev.map((row) => (row.id === item.id ? data : row)));
              }
            })
          );
        }

        return items;
      } finally {
        liveRefreshInFlight.current = null;
        setLiveRefreshing(false);
      }
    })();

    liveRefreshInFlight.current = request;
    return request;
  }, [cartItems, supabase]);

  const addToCart = useCallback(async ({ product, quantity }) => {
    if (!supabase) { toast.error('Sign in to add items to your cart.'); return; }
    if (!userId) { toast.error('Sign in to add items to your cart.'); return; }

    const validQty = snapQuantity(quantity, product.minimum_quantity, product.quantity_increment);

    let live = null;
    try {
      live = await fetchLiveSnapshot(product.record_id);
      setLiveByItemId((prev) => ({ ...prev, [String(product.record_id)]: live }));
    } catch (err) {
      console.warn('[addToCart] live pricing unavailable, using catalog price', err);
    }

    if (live && !live.error) {
      if (live.discontinued || live.isAvailable === false) {
        toast.error(`${product.name} is currently unavailable.`);
        return;
      }
      if (live.qtyAvailable != null && validQty > live.qtyAvailable) {
        toast.error(
          live.qtyAvailable <= 0
            ? `${product.name} is out of stock.`
            : `Only ${live.qtyAvailable} of ${product.name} available.`
        );
        return;
      }
    }

    const unitPrice =
      live?.unitPrice != null && Number.isFinite(Number(live.unitPrice))
        ? Number(live.unitPrice)
        : product.unit_price;

    const existing = cartItems.find((i) => i.item_id === product.record_id);

    if (existing) {
      const newQty = snapQuantity(
        existing.quantity + validQty,
        product.minimum_quantity,
        product.quantity_increment
      );

      if (live?.qtyAvailable != null && newQty > live.qtyAvailable) {
        toast.error(
          live.qtyAvailable <= 0
            ? `${product.name} is out of stock.`
            : `Only ${live.qtyAvailable} of ${product.name} available.`
        );
        return;
      }

      const { data } = await supabase
        .from('cart_items')
        .update({
          quantity: newQty,
          unit_price: unitPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      setCartItems((prev) => prev.map((i) => (i.id === existing.id ? data : i)));
    } else {
      const row = {
        user_id: userId,
        item_id: product.record_id,
        item_number: product.item_number,
        manufacturer_id: product.manufacturer_id,
        manufacturer_name: product.manufacturer_name,
        name: product.name,
        unit_price: unitPrice,
        quantity: validQty,
        unit_qty: product.unit_qty,
        minimum_quantity: product.minimum_quantity ?? 1,
        quantity_increment: product.quantity_increment ?? 1,
        primary_image_url: product.primary_image_url,
      };
      const { data } = await supabase.from('cart_items').insert(row).select().single();
      if (data) setCartItems((prev) => [...prev, data]);
    }

    toast.success(
      live?.unitPrice != null
        ? `${product.name} added at live MarketTime price`
        : `${product.name} added to cart`
    );
    setCartOpen(true);
  }, [cartItems, supabase, userId]);

  const updateQuantity = useCallback(async (cartItemId, newQuantity) => {
    if (!supabase) return;
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) return;

    const validQty = snapQuantity(newQuantity, item.minimum_quantity, item.quantity_increment);
    const live = liveByItemId[String(item.item_id)];
    if (live?.qtyAvailable != null && validQty > live.qtyAvailable) {
      toast.error(
        live.qtyAvailable <= 0
          ? `${item.name} is out of stock.`
          : `Only ${live.qtyAvailable} available.`
      );
      return;
    }

    const { data } = await supabase
      .from('cart_items')
      .update({ quantity: validQty, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select()
      .single();

    if (data) setCartItems((prev) => prev.map((i) => (i.id === cartItemId ? data : i)));
  }, [cartItems, liveByItemId, supabase]);

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
      liveByItemId,
      liveRefreshing,
      setCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshLivePricing,
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
