'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PROMO_GROUP_ICONS = {
  spring: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2 2 4-4" />
    </svg>
  ),
  'new-customer': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  shipping: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  volume: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  other: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

export default function PromosSection() {
  const [groups, setGroups] = useState([]);
  const [promoTab, setPromoTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/promotions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load promotions');

        if (cancelled) return;
        const nextGroups = data.groups ?? [];
        setGroups(nextGroups);
        setPromoTab(nextGroups[0]?.id ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setGroups([]);
          setError(err.message || 'Could not load promotions');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalDeals = groups.reduce((n, g) => n + g.deals.length, 0);

  return (
    <section className="section promos-section" id="featured">
      <div className="section-container">
        <div className="section-header section-header-center">
          <div>
            <h2 className="section-title">
              Promos <span className="promo-and-sign">&</span> Specials
            </h2>
            <p className="section-subtitle">
              Live deals from MarketTime — updated automatically
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#f15a24] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12 text-[#5f6980] bg-white rounded-2xl border border-black/[0.06]">
            <p className="font-medium text-[#1a1d26]">Promotions unavailable right now</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && totalDeals === 0 && (
          <div className="text-center py-12 text-[#5f6980] bg-white rounded-2xl border border-black/[0.06]">
            <p className="font-medium text-[#1a1d26]">No active promotions at the moment</p>
            <p className="text-sm mt-2">Check back soon or browse the full catalog.</p>
            <Link href="/catalog" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
              Shop All Products
            </Link>
          </div>
        )}

        {!loading && !error && totalDeals > 0 && (
          <>
            <div className="promo-tabs">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`promo-tab ${promoTab === g.id ? 'active' : ''}`}
                  data-group={g.id}
                  onClick={() => {
                    setPromoTab(g.id);
                    document.querySelector(`[data-group="${g.id}"]`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                      inline: 'center',
                    });
                  }}
                >
                  {PROMO_GROUP_ICONS[g.icon] ?? PROMO_GROUP_ICONS.other}
                  {g.label}
                  <span className="promo-tab-count">{g.deals.length}</span>
                </button>
              ))}
            </div>

            {groups.map((g) => (
              <div
                key={g.id}
                className={`promo-group ${promoTab === g.id ? 'active' : ''}`}
                data-group={g.id}
              >
                <div className="promo-cards">
                  {g.deals.map((deal) => (
                    <div key={deal.recordID ?? `${deal.title}-${deal.brand}`} className="promo-card">
                      <div className="promo-card-left">
                        <div className="promo-card-brand-row">
                          {deal.brandLogo && (
                            <img src={deal.brandLogo} alt={deal.brand} className="promo-card-logo" />
                          )}
                          <span className="promo-card-brand">{deal.brand}</span>
                          {deal.badge && <span className="promo-card-badge">{deal.badge}</span>}
                        </div>
                        <h4 className="promo-card-title">{deal.title}</h4>
                        <p className="promo-card-desc">{deal.description}</p>
                        <span className="promo-card-dates">{deal.dates}</span>
                      </div>
                      <div className="promo-card-right">
                        <div className="promo-card-discount">{deal.discount}</div>
                        <div className="promo-card-spend">on {deal.spend}</div>
                        <Link href={deal.catalogHref || '/catalog'} className="btn btn-primary promo-card-cta">
                          Shop {deal.brand}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
