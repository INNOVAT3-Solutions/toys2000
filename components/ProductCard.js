'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/cart';

export default function ProductCard({ product, onQuickView, showPrices = true }) {
  const {
    record_id,
    name,
    manufacturer_name,
    unit_price,
    primary_image_url,
    is_available,
    discount_percent,
    minimum_quantity,
  } = product;

  const [inView, setInView] = useState(false);
  const cardRef = useRef(null);

  // Scroll-in animation — adds .in-view when card enters the viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasDiscount = discount_percent > 0;

  return (
    <div ref={cardRef} className={`product-card${inView ? ' in-view' : ''}`}>
      {/* Image area */}
      <div className="product-image-container">
        <Link href={`/product/${record_id}`} className="relative block h-full">
          {primary_image_url ? (
            <Image
              src={primary_image_url}
              alt={name}
              fill
              className="product-image"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)', fontSize: '0.8rem',
                background: 'var(--bg-surface)',
              }}
            >
              No image
            </div>
          )}
        </Link>

        {/* Discount badge */}
        {hasDiscount && (
          <span className="fp-badge fp-badge-promo">{discount_percent}% off</span>
        )}

        {/* Out of stock badge */}
        {!is_available && (
          <span className="fp-badge" style={{ background: '#9ca3af', color: 'white', borderColor: '#9ca3af' }}>
            Out of stock
          </span>
        )}

        {/* Quick view on hover */}
        {onQuickView && (
        <button
          className="product-quickview-btn"
          onClick={(e) => { e.preventDefault(); onQuickView(product); }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Quick view
        </button>
        )}
      </div>

      {/* Text info */}
      <div className="product-info">
        <p className="product-brand-tag">{manufacturer_name}</p>
        <Link href={`/product/${record_id}`} style={{ textDecoration: 'none' }}>
          <h3 className="product-title">{name}</h3>
        </Link>
        <div className="product-price-row">
          {showPrices ? (
            <>
              <span className="product-price">{formatCurrency(unit_price)}</span>
              {minimum_quantity > 1 && (
                <span className="product-bulk-price">min {minimum_quantity}</span>
              )}
            </>
          ) : (
            <span className="product-bulk-price">Sign in to see pricing</span>
          )}
        </div>
        <div className="product-actions">
          <Link href={`/product/${record_id}`} className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '10px 16px' }}>
            View product
          </Link>
        </div>
      </div>
    </div>
  );
}
