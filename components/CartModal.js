'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency, snapQuantity, groupByManufacturer, vendorSubtotal } from '@/lib/cart';

export default function CartModal({ open, onClose, cartItems = [], onUpdateQuantity, onRemove, onClear }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const grouped = groupByManufacturer(cartItems);
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const grandTotal = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <>
      <div
        className={`cart-overlay${open ? ' active' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div className={`cart-drawer${open ? ' active' : ''}`}>
        <div className="cart-header">
          <div className="cart-header-left">
            <h2>Your Cart</h2>
            <span className="cart-header-count">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
          </div>
          <button type="button" className="close-cart" onClick={onClose} aria-label="Close cart">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3>Your cart is empty</h3>
              <p>Add products from the catalog to get started.</p>
              <Link href="/catalog" onClick={onClose} className="btn btn-primary cart-shop-btn">
                Browse catalog
              </Link>
            </div>
          ) : (
            Object.values(grouped).map((group) =>
              group.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                />
              ))
            )
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <div className="cart-summary-row cart-summary-shipping">
                <span className="cart-shipping-note">Shipping calculated at checkout</span>
              </div>
            </div>
            <Link href="/cart" onClick={onClose} className="btn btn-primary cart-checkout-btn">
              View cart &amp; checkout
            </Link>
            <button type="button" className="cart-clear-btn" onClick={onClear}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function CartItemRow({ item, onUpdateQuantity, onRemove }) {
  const handleQtyChange = (delta) => {
    const next = item.quantity + delta * (item.quantity_increment || 1);
    if (next < (item.minimum_quantity || 1)) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, snapQuantity(next, item.minimum_quantity, item.quantity_increment));
    }
  };

  return (
    <div className="cart-item">
      {item.primary_image_url ? (
        <Image
          src={item.primary_image_url}
          alt={item.name}
          width={72}
          height={72}
          className="cart-item-img"
        />
      ) : (
        <div className="cart-item-img" style={{ background: 'var(--bg-surface-alt)' }} />
      )}
      <div className="cart-item-details">
        <p className="cart-item-title">{item.name}</p>
        {item.manufacturer_name && <p className="cart-item-brand">{item.manufacturer_name}</p>}
        <div className="cart-item-pricing">
          <span className="cart-item-unit-price">{formatCurrency(item.unit_price)} each</span>
        </div>
        <div className="cart-item-qty">
          <button type="button" className="qty-btn-cart" onClick={() => handleQtyChange(-1)} aria-label="Decrease quantity">−</button>
          <span className="cart-qty-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.quantity}
          </span>
          <button type="button" className="qty-btn-cart" onClick={() => handleQtyChange(1)} aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div className="cart-item-right">
        <span className="cart-item-line-total">{formatCurrency(item.unit_price * item.quantity)}</span>
        <button type="button" className="cart-item-remove" onClick={() => onRemove(item.id)} aria-label="Remove item">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
