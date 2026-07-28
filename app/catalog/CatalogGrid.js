'use client';

import { useState, useCallback, useTransition } from 'react';
import ProductCard from '@/components/ProductCard';
import QuickView from '@/components/QuickView';
import { useCart } from '@/components/CartProvider';

const PAGE_SIZE = 48;

export default function CatalogGrid({ initialProducts, initialTotal, manufacturers, initialFilters, categoryLabel = null, showPrices = true }) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { addToCart } = useCart();

  const fetchProducts = useCallback(async (newFilters, newPage = 1) => {
    const params = new URLSearchParams();
    if (newFilters.manufacturerID) params.set('manufacturer_id', newFilters.manufacturerID);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.search) params.set('search', newFilters.search);
    params.set('page', String(newPage));
    params.set('limit', String(PAGE_SIZE));

    const res = await fetch(`/api/catalog?${params}`);
    const data = await res.json();

    if (!res.ok) {
      setFetchError(data.error || 'Failed to load products');
      return;
    }

    setFetchError(null);

    if (newPage === 1) {
      setProducts(data.products ?? []);
    } else {
      setProducts((prev) => [...prev, ...(data.products ?? [])]);
    }
    setTotal(data.total ?? 0);
    setPage(newPage);
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || null };
    setFilters(newFilters);
    startTransition(() => fetchProducts(newFilters, 1));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const newFilters = { ...filters, search: search || null };
    setFilters(newFilters);
    startTransition(() => fetchProducts(newFilters, 1));
  };

  const loadMore = () => {
    startTransition(() => fetchProducts(filters, page + 1));
  };

  const hasMore = products.length < total;

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4 mb-6 flex flex-wrap gap-3 items-center">
        {!showPrices && (
          <p className="w-full text-sm text-[#5f6980] bg-[#f7f8fa] rounded-lg px-3 py-2">
            Browsing as guest — <a href="/login?redirect=/catalog" className="text-[#00aeef] font-semibold hover:underline">sign in</a> to view wholesale pricing and place orders.
          </p>
        )}
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#f15a24' }}
          >
            Search
          </button>
        </form>

        {/* Brand filter */}
        <select
          value={filters.manufacturerID || ''}
          onChange={(e) => handleFilterChange('manufacturerID', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#f15a24] bg-white"
        >
          <option value="">All Brands</option>
          {manufacturers.map((m) => (
            <option key={m.manufacturer_id} value={m.manufacturer_id}>{m.name}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(filters.manufacturerID || filters.category || filters.search) && (
          <button
            onClick={() => {
              setSearch('');
              setFilters({ manufacturerID: null, category: null, search: null });
              startTransition(() => fetchProducts({ manufacturerID: null, category: null, search: null }, 1));
              if (filters.category) window.history.replaceState(null, '', '/catalog');
            }}
            className="text-sm text-[#5f6980] hover:text-[#f15a24] transition-colors"
          >
            Clear filters
          </button>
        )}
        {categoryLabel && !filters.manufacturerID && (
          <span className="text-xs font-semibold text-[#f15a24] bg-[#fff5f0] px-3 py-1.5 rounded-full">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Grid */}
      {fetchError ? (
        <div className="text-center py-16 text-red-600 bg-red-50 rounded-2xl border border-red-200">
          <p className="text-lg font-medium">{fetchError}</p>
        </div>
      ) : isPending && products.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#f15a24] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-[#5f6980]">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${isPending ? 'opacity-60' : ''} transition-opacity`}>
            {products.map((product) => (
              <ProductCard
                key={product.record_id}
                product={product}
                onQuickView={showPrices ? setQuickViewProduct : undefined}
                showPrices={showPrices}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={isPending}
                className="px-8 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
              >
                {isPending ? 'Loading…' : `Load more (${total - products.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Quick View */}
      <QuickView
        product={quickViewProduct}
        open={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={addToCart}
        showPrices={showPrices}
      />
    </>
  );
}
