'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import CatalogViewer from '@/components/CatalogViewer';
import { brands, catalogsForBrand, catalogProductsHref, primaryCatalogForBrand } from '@/lib/marketing-data';

function catalogShopHref(brandId) {
  return catalogProductsHref(brandId);
}

export default function BrandPage({ brand }) {
  const catalog = primaryCatalogForBrand(brand.id);
  const allCatalogs = catalogsForBrand(brand.id);
  const embedCatalog = allCatalogs.find((c) => c.catalogUrl) || null;
  const embedRef = useRef(null);
  const [viewerCatalog, setViewerCatalog] = useState(null);

  const heroImage = brand.heroImage || brand.images?.[0] || '';
  const brandLogo = brand.logo || catalog?.logo || '';
  const galleryImages = [brand.heroImage, ...(brand.images || [])].filter(Boolean).slice(0, 4);

  const siblings = brands
    .filter((b) => b.id !== brand.id && b.category === brand.category)
    .slice(0, 6);

  const scrollToEmbed = () => {
    if (embedRef.current) {
      embedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (catalog) setViewerCatalog(catalog);
  };

  return (
    <div className="brand-container animate-fade-in">
      {viewerCatalog && (
        <CatalogViewer catalog={viewerCatalog} onClose={() => setViewerCatalog(null)} />
      )}

      <div className="brand-hero">
        {brand.heroVideo ? (
          <video className="hero-video" autoPlay loop muted playsInline>
            <source src={brand.heroVideo} type="video/mp4" />
          </video>
        ) : (
          <div
            className="hero-video"
            style={{
              backgroundImage: heroImage ? `url('${heroImage}')` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className="hero-overlay" />
        <div className="hero-content animate-fade-in">
          <Link href="/" className="brand-back-btn" id="brand-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Brands
          </Link>
          {brandLogo ? (
            <img src={brandLogo} alt={brand.name} className="brand-home-hero-logo" style={{ maxHeight: 72, marginBottom: 12 }} />
          ) : null}
          <span className="brand-hero-tagline">{brand.tagline}</span>
          <h1>{brand.name}</h1>
          <p>{brand.description}</p>
          <div className="brand-hero-actions">
            {(catalog?.catalogUrl || catalog?.pdfUrl) && (
              <button type="button" className="btn btn-hero-primary" onClick={scrollToEmbed}>
                View Digital Catalog
              </button>
            )}
            <Link href={catalogShopHref(brand.id)} className="btn btn-hero-secondary">
              Shop Live Products
            </Link>
          </div>
        </div>
      </div>

      {embedCatalog?.catalogUrl && (
        <div
          className="catalog-embed-section"
          id="catalog-embed"
          ref={embedRef}
          style={{
            padding: '60px 20px 20px',
            maxWidth: 1400,
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="products-section-header">
            <h2>
              {brand.name} {embedCatalog.year || ''} Catalog
            </h2>
            <span className="products-count">Scroll to view pages</span>
          </div>
          <div
            className="catalog-iframe-container"
            style={{
              position: 'relative',
              paddingBottom: '60%',
              height: 0,
              overflow: 'hidden',
              borderRadius: 16,
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              border: '1px solid var(--glass-border)',
              background: '#fdfdfd',
              width: '100%',
            }}
          >
            <iframe
              src={embedCatalog.catalogUrl}
              seamless="seamless"
              scrolling="no"
              frameBorder="0"
              allowFullScreen
              title={`${brand.name} catalog`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}

      {catalog?.pdfUrl && !embedCatalog?.catalogUrl && (
        <section className="section brand-home-section" id="brand-catalog">
          <div className="section-container">
            <div
              className="brand-catalog-cta"
              style={{ backgroundImage: heroImage ? `url('${heroImage}')` : undefined }}
            >
              <div className="brand-catalog-cta-overlay" />
              <div className="brand-catalog-cta-content">
                <span className="brand-catalog-cta-eyebrow">{catalog.year || 'Latest'} Catalog</span>
                <h2>
                  The complete {brand.name} {catalog.year || ''} lineup
                </h2>
                <p>Flip through the full product line, specs, and wholesale pricing.</p>
                <button
                  type="button"
                  className="btn-hero-primary"
                  onClick={() => setViewerCatalog(catalog)}
                >
                  Open the Catalog
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section brand-home-section brand-story-section" id="brand-story">
        <div className="section-container">
          <div className="brand-story-grid">
            <div className="brand-story-text">
              <span className="brand-story-eyebrow">About the brand</span>
              <h2 className="brand-story-headline">
                Why retailers choose{' '}
                <span className="title-cursive title-orange">{brand.name}</span>
              </h2>
              <p>{brand.description}</p>
              <p>
                Toys 2000 stocks the full {brand.name} lineup with wholesale pricing, dedicated rep
                support, and freight programs that work for resorts, gift shops, and specialty
                retailers across the Eastern US, Puerto Rico, and the Caribbean.
              </p>
              <ul className="brand-story-features">
                <li>
                  <strong>Trusted partner</strong> — long-standing distribution relationship
                </li>
                <li>
                  <strong>Stocked inventory</strong> — fast turnaround on reorders
                </li>
                <li>
                  <strong>Promo-eligible</strong> — current Market Time specials apply
                </li>
              </ul>
              <div className="brand-story-ctas">
                <Link href={catalogShopHref(brand.id)} className="btn btn-primary">
                  Browse {brand.name}
                </Link>
                <a
                  href={`mailto:Jim@toys2000.fun?subject=${encodeURIComponent(`${brand.name} inquiry`)}`}
                  className="btn btn-outline"
                >
                  Talk to a Rep
                </a>
              </div>
            </div>
            {galleryImages.length > 0 && (
              <div className="brand-story-visual">
                {galleryImages.map((src, i) => (
                  <div
                    key={src}
                    className={`brand-story-tile brand-story-tile--${i}`}
                    style={{ backgroundImage: `url('${src}')` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {siblings.length > 0 && (
        <section className="section brand-home-section" id="brand-related">
          <div className="section-container">
            <div className="section-header section-header-center">
              <div>
                <h2 className="section-title">You Might Also Like</h2>
                <p className="section-subtitle">
                  Other brands in the {brand.category.split('-').join(' ')} category.
                </p>
              </div>
            </div>
            <div className="brand-related-grid">
              {siblings.map((s) => (
                <Link key={s.id} href={`/brands/${s.id}`} className="brand-related-card">
                  <div
                    className="brand-related-card-img"
                    style={{ backgroundImage: s.heroImage ? `url('${s.heroImage}')` : undefined }}
                  />
                  <div className="brand-related-card-body">
                    {s.logo ? (
                      <img src={s.logo} alt={s.name} className="brand-related-card-logo" />
                    ) : (
                      <h4>{s.name}</h4>
                    )}
                    <p>{s.tagline || ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="footer-bottom">
          <div className="section-container">
            <div className="footer-bottom-inner">
              <span>&copy; 2026 Toys2000. All rights reserved.</span>
              <div className="footer-bottom-links">
                <Link href="/">Back to Toys 2000 Home</Link>
                <a href="mailto:Jim@toys2000.fun">Contact Sales</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
