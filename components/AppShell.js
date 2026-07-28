'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import CartModal from './CartModal';
import { useCart } from './CartProvider';

export default function AppShell({ children }) {
  const { cartItems, cartCount, cartOpen, setCartOpen, updateQuantity, removeFromCart, clearCart } = useCart();

  return (
    <>
      <Navbar cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onClear={() => clearCart()}
      />
      <main>{children}</main>
    </>
  );
}
