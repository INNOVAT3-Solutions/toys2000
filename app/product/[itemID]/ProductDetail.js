'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { snapQuantity, isValidQuantity, formatCurrency } from '@/lib/cart';
import { useCart } from '@/components/CartProvider';
import ProductCard from '@/components/ProductCard';
import ProductDescription from '@/components/ProductDescription';

export default function ProductDetail({ product, related, showPrices = true }) {
  const {
    record_id,
    name,
    manufacturer_id,
    manufacturer_name,
    description,
    unit_price,
    retail_price,
    minimum_quantity = 1,
    quantity_increment = 1,
    primary_image_url,
    additional_image_urls,
    is_available,
    qty_available,
    volume_pricing,
    scs_details,
    discount_percent,
  } = product;

  const images = [primary_image_url, ...(additional_image_urls ?? [])].filter(Boolean);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(minimum_quantity);
  const [adding, setAdding] = useState(false);

  const { addToCart } = useCart();

  const handleQtyChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta * quantity_increment;
      return Math.max(minimum_quantity, next);
    });
  };

  const handleQtyInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setQuantity(val);
  };

  const handleQtyBlur = () => {
    setQuantity(snapQuantity(quantity, minimum_quantity, quantity_increment));
  };

  const handleAddToCart = async () => {
    const validQty = snapQuantity(quantity, minimum_quantity, quantity_increment);
    setAdding(true);
    await addToCart({ product, quantity: validQty });
    setAdding(false);
  };

  const lineTotal = unit_price * quantity;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#5f6980] mb-6 flex items-center gap-2">
          <Link href="/catalog" className="hover:text-[#f15a24]">Catalog</Link>
          <span>›</span>
          <Link href={`/catalog/${manufacturer_id}`} className="hover:text-[#f15a24]">{manufacturer_name}</Link>
          <span>›</span>
          <span className="text-[#1a1d26] font-medium line-clamp-1">{name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div>
            <div className="relative aspect-square bg-white rounded-2xl border border-black/[0.06] overflow-hidden mb-3">
              {images[selectedImage] ? (
                <Image
                  src={images[selectedImage]}
                  alt={name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[#5f6980]">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 rounded-lg border-2 flex-shrink-0 overflow-hidden transition-all ${
                      i === selectedImage ? 'border-[#f15a24]' : 'border-black/[0.06]'
                    }`}
                  >
                    <Image src={img} alt={`${name} ${i + 1}`} fill className="object-contain p-1" sizes="64px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              <Link href={`/catalog/${manufacturer_id}`} className="text-sm text-[#00aeef] font-semibold hover:underline">
                {manufacturer_name}
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1d26] mt-2" style={{ fontFamily: "'Baloo 2', cursive" }}>
                {name}
              </h1>
            </div>

            {/* Price */}
            {showPrices ? (
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#1a1d26]">{formatCurrency(unit_price)}</span>
                {retail_price && (
                  <span className="text-sm text-[#5f6980]">MSRP: {formatCurrency(retail_price)}</span>
                )}
                {discount_percent > 0 && (
                  <span className="text-sm font-bold text-[#f15a24]">{discount_percent}% off</span>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-[#f7f8fa] border border-black/[0.06] px-4 py-3 text-sm text-[#5f6980]">
                Wholesale pricing is available to approved retailers.{' '}
                <Link href={`/login?redirect=/product/${record_id}`} className="text-[#00aeef] font-semibold hover:underline">
                  Sign in
                </Link>{' '}
                to view pricing and place orders.
              </div>
            )}

            {/* Availability */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${is_available ? 'bg-[#8cc63f]' : 'bg-red-400'}`} />
              <span className={is_available ? 'text-[#8cc63f] font-semibold' : 'text-red-500 font-semibold'}>
                {is_available ? (qty_available != null ? `${qty_available} in stock` : 'In stock') : 'Out of stock'}
              </span>
            </div>

            {/* Volume pricing */}
            {showPrices && volume_pricing?.length > 0 && (
              <div className="bg-[#f7f8fa] rounded-xl p-4">
                <p className="text-xs font-bold text-[#5f6980] uppercase tracking-wide mb-2">Volume Pricing</p>
                <div className="space-y-1">
                  {volume_pricing.map((tier, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[#5f6980]">{tier.volumeQuantity}+ units</span>
                      <span className="font-semibold text-[#1a1d26]">{formatCurrency(tier.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variants */}
            {scs_details?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#5f6980] uppercase tracking-wide mb-2">Available Options</p>
                <div className="flex flex-wrap gap-2">
                  {scs_details.map((v, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-[#1a1d26]">
                      {[v.color, v.size, v.style].filter(Boolean).join(' / ')}
                      {v.price && v.price !== unit_price && ` — ${formatCurrency(v.price)}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showPrices ? (
              <>
                {/* Quantity controls */}
                <div>
                  <p className="text-sm font-medium text-[#1a1d26] mb-2">
                    Quantity
                    <span className="text-[#5f6980] font-normal ml-2 text-xs">
                      (min {minimum_quantity}{quantity_increment > 1 ? `, increments of ${quantity_increment}` : ''})
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleQtyChange(-1)} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xl font-medium text-[#1a1d26] hover:bg-[#f7f8fa]">−</button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={handleQtyInput}
                      onBlur={handleQtyBlur}
                      className="w-20 text-center border border-gray-200 rounded-lg py-2 font-semibold focus:outline-none focus:border-[#f15a24]"
                      min={minimum_quantity}
                      step={quantity_increment}
                    />
                    <button onClick={() => handleQtyChange(1)} className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xl font-medium text-[#1a1d26] hover:bg-[#f7f8fa]">+</button>
                    <span className="text-lg font-bold text-[#1a1d26]">{formatCurrency(lineTotal)}</span>
                  </div>
                  {!isValidQuantity(quantity, minimum_quantity, quantity_increment) && quantity > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Quantity will snap to {snapQuantity(quantity, minimum_quantity, quantity_increment)} when added.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={adding || !is_available}
                  className="w-full py-4 rounded-xl font-bold text-white text-base transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive" }}
                >
                  {adding ? 'Adding…' : is_available ? 'Add to cart' : 'Out of stock'}
                </button>
              </>
            ) : (
              <Link
                href={`/login?redirect=/product/${record_id}`}
                className="w-full py-4 rounded-xl font-bold text-white text-base text-center block no-underline"
                style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)', fontFamily: "'Baloo 2', cursive", color: '#ffffff' }}
              >
                Sign in to order
              </Link>
            )}

            {/* Description */}
            {description && (
              <div className="border-t border-black/[0.06] pt-5">
                <h2 className="text-sm font-bold text-[#1a1d26] mb-2">Description</h2>
                <ProductDescription description={description} />
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-[#1a1d26] mb-6" style={{ fontFamily: "'Baloo 2', cursive" }}>
              More from {manufacturer_name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {related.map((p) => (
                <ProductCard key={p.record_id} product={p} showPrices={showPrices} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
