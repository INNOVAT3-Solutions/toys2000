'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import CatalogViewer from '@/components/CatalogViewer';
import {
  brands,
  catalogs,
  catalogFamilies,
  catalogPageUrl,
  familyIdFor,
  heroSlides,
  productHighlights,
  promoBanners,
  resolveCatalog,
} from '@/lib/marketing-data';
import { buildPromoGroups } from './promo-groups';

const SLIDE_DURATION = 6000;
const CATALOGS_PER_PAGE = 10;
const EDGE_SLOP = 12;

function renderHeadline(slide) {
  const idx = slide.headline.indexOf(slide.accentWord);
  if (idx === -1) return slide.headline;
  return (
    <>
      {slide.headline.slice(0, idx)}
      <span className={`hero-accent hero-accent--${slide.textEffect} ${slide.accentClass || ''}`}>
        {slide.accentWord}
      </span>
      {slide.headline.slice(idx + slide.accentWord.length)}
    </>
  );
}

function catalogHref(brandId) {
  return brandId ? `/catalog?brand=${encodeURIComponent(brandId)}` : '/catalog';
}

function HeroCta({ cta, variant, onOpenCatalog, onAnchorClick }) {
  const isPrimary = variant === 'primary';
  const className = isPrimary ? 'btn-hero-primary' : 'btn-hero-secondary';

  if (cta.catalog) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          const catalog = resolveCatalog(cta.catalog);
          if (catalog) onOpenCatalog(catalog);
        }}
      >
        {cta.text}
      </button>
    );
  }

  if (cta.link?.startsWith('#')) {
    return (
      <a href={cta.link} className={className} onClick={(e) => onAnchorClick(e, cta.link)}>
        {cta.text}
      </a>
    );
  }

  if (cta.link?.startsWith('http')) {
    return (
      <a href={cta.link} className={className} target="_blank" rel="noopener noreferrer">
        {cta.text}
      </a>
    );
  }

  const href =
    cta.link?.startsWith('/brands/') ? cta.link :
    cta.brand ? catalogHref(cta.brand) :
    cta.link || '/catalog';

  return (
    <Link href={href} className={className}>
      {cta.text}
    </Link>
  );
}

export default function JuanHome() {
  const liveCatalogs = useMemo(
    () => catalogs.filter((c) => c.catalogUrl || c.pdfUrl),
    []
  );
  const promoGroups = useMemo(() => buildPromoGroups(), []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [viewerCatalog, setViewerCatalog] = useState(null);
  const [promoTab, setPromoTab] = useState(promoGroups[0]?.id || 'spring');
  const [catalogFamily, setCatalogFamily] = useState('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [gridAnimate, setGridAnimate] = useState(true);
  const [newsletterDone, setNewsletterDone] = useState(false);

  const heroRef = useRef(null);
  const progressRef = useRef(null);
  const touchStartX = useRef(0);
  const hlRailRef = useRef(null);
  const [hlPrevDisabled, setHlPrevDisabled] = useState(true);
  const [hlNextDisabled, setHlNextDisabled] = useState(false);
  const catalogsSectionRef = useRef(null);

  const openCatalog = useCallback((catalog) => {
    if (catalog && (catalog.catalogUrl || catalog.pdfUrl)) {
      setViewerCatalog(catalog);
    }
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(((index % heroSlides.length) + heroSlides.length) % heroSlides.length);
    setProgressKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((c) => (c + 1) % heroSlides.length);
      setProgressKey((k) => k + 1);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = `width ${SLIDE_DURATION}ms linear`;
    bar.style.width = '100%';
  }, [progressKey]);

  const handleHeroTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleHeroTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goToSlide(currentSlide + (diff > 0 ? 1 : -1));
    }
  };

  const handleAnchorClick = (e, href) => {
    e.preventDefault();
    if (href === '#') return;
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredCatalogs = useMemo(() => {
    if (catalogFamily === 'all') return liveCatalogs;
    return liveCatalogs.filter((c) => familyIdFor(c.brandId) === catalogFamily);
  }, [catalogFamily, liveCatalogs]);

  const catalogPageCount = Math.max(1, Math.ceil(filteredCatalogs.length / CATALOGS_PER_PAGE));
  const safeCatalogPage = Math.min(Math.max(1, catalogPage), catalogPageCount);
  const catalogSliceStart = (safeCatalogPage - 1) * CATALOGS_PER_PAGE;
  const visibleCatalogs = filteredCatalogs.slice(
    catalogSliceStart,
    catalogSliceStart + CATALOGS_PER_PAGE
  );

  useEffect(() => {
    setGridAnimate(false);
    const t = requestAnimationFrame(() => setGridAnimate(true));
    return () => cancelAnimationFrame(t);
  }, [catalogFamily, safeCatalogPage]);

  const changeCatalogFamily = (family) => {
    setCatalogFamily(family);
    setCatalogPage(1);
    catalogsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeCatalogPage = (page) => {
    setCatalogPage(page);
    catalogsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const syncHlNav = useCallback(() => {
    const rail = hlRailRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth - EDGE_SLOP;
    setHlPrevDisabled(rail.scrollLeft <= EDGE_SLOP);
    setHlNextDisabled(rail.scrollLeft >= max);
  }, []);

  useEffect(() => {
    const rail = hlRailRef.current;
    if (!rail) return;
    syncHlNav();
    rail.addEventListener('scroll', syncHlNav, { passive: true });
    window.addEventListener('resize', syncHlNav);
    return () => {
      rail.removeEventListener('scroll', syncHlNav);
      window.removeEventListener('resize', syncHlNav);
    };
  }, [syncHlNav]);

  const hlStep = () => {
    const rail = hlRailRef.current;
    const card = rail?.querySelector('.hl-card');
    if (!card || !rail) return rail?.clientWidth || 0;
    const gap = parseInt(getComputedStyle(rail).gap, 10) || 20;
    return (card.offsetWidth + gap) * 2;
  };

  const openHighlight = (highlight) => {
    const catalog = catalogs.find((c) => c.id === highlight.catalogId);
    if (!catalog) return;
    const url = catalogPageUrl(catalog, highlight.page);
    openCatalog(
      catalog.pdfUrl ? { ...catalog, pdfUrl: url } : { ...catalog, catalogUrl: url }
    );
  };

  const signupBanner = promoBanners[0];
  const signupLink = signupBanner?.link || 'https://toys2000.markettime.com/signup';

  const handleNewsletter = (e) => {
    e.preventDefault();
    setNewsletterDone(true);
    toast.success('Successfully subscribed to our newsletter!');
    setTimeout(() => {
      setNewsletterDone(false);
      e.target.reset();
    }, 3000);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document
      .querySelectorAll('.home-page .section, .home-page .promo-card')
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page">
      {viewerCatalog && (
        <CatalogViewer catalog={viewerCatalog} onClose={() => setViewerCatalog(null)} />
      )}

      <section
        className="hero"
        id="hero"
        ref={heroRef}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <video
          className="hero-video-bg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        >
          <source src="/brand-videos/toys-2000.mp4" type="video/mp4" />
        </video>

        {heroSlides.map((slide, i) => (
          <div
            key={slide.id}
            className={`hero-slide ${i === currentSlide ? 'active' : ''}`}
            data-index={i}
          >
            <div
              className="hero-slide-bg"
              style={{
                '--bg-wide': `url('${slide.image}')`,
                '--bg-tall': `url('${slide.imagePortrait || slide.image}')`,
              }}
            />
          </div>
        ))}
        <div className="hero-overlay" />

        <div className="hero-center">
          {heroSlides.map((slide, i) => (
            <div
              key={slide.id}
              className={`hero-content ${i === currentSlide ? 'active' : ''}`}
              data-index={i}
            >
              <div className="hero-tag animate-item">{slide.tag}</div>
              <h1 className="hero-headline animate-item">{renderHeadline(slide)}</h1>
              <p className="hero-sub animate-item">{slide.subheadline}</p>
              <div className="hero-ctas">
                <HeroCta
                  cta={slide.ctaPrimary}
                  variant="primary"
                  onOpenCatalog={openCatalog}
                  onAnchorClick={handleAnchorClick}
                />
                <HeroCta
                  cta={slide.ctaSecondary}
                  variant="secondary"
                  onOpenCatalog={openCatalog}
                  onAnchorClick={handleAnchorClick}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hero-bottom">
          <div className="hero-dots">
            {heroSlides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={`hero-dot ${i === currentSlide ? 'active' : ''}`}
                data-slide={i}
                aria-label={slide.tag}
                onClick={() => goToSlide(i)}
              >
                <span className="hero-dot-fill" />
              </button>
            ))}
          </div>
          <div className="hero-progress">
            <div className="hero-progress-bar" ref={progressRef} id="hero-progress-bar" />
          </div>
        </div>
      </section>

      <div className="main-content-gradient">
        <section className="section catalog-library" id="catalogs" ref={catalogsSectionRef}>
          <div className="section-container">
            <div className="lib-header">
              <h2 className="catalog-headline">
                Browse the Latest Product <span className="title-cursive title-orange">Catalogs</span>
              </h2>
              <p className="catalog-subtext">
                Every current catalog from our manufacturers — open any cover to flip through full
                product lines, specs, and pricing without leaving the page.
              </p>
              <div className="lib-meta">
                <span className="lib-count" id="lib-range">
                  {filteredCatalogs.length
                    ? `Showing ${catalogSliceStart + 1}–${catalogSliceStart + visibleCatalogs.length} of ${filteredCatalogs.length}`
                    : 'No catalogs'}
                </span>
                <span className="lib-dot" />
                <span>{new Set(liveCatalogs.map((c) => c.brandId)).size} manufacturers</span>
              </div>
            </div>

            <div className="lib-filters" id="lib-filters" role="tablist">
              <button
                type="button"
                className={`lib-chip ${catalogFamily === 'all' ? 'active' : ''}`}
                data-family="all"
                role="tab"
                aria-selected={catalogFamily === 'all'}
                onClick={() => changeCatalogFamily('all')}
              >
                All <span className="lib-chip-n">{liveCatalogs.length}</span>
              </button>
              {catalogFamilies.map((f) => {
                const n = liveCatalogs.filter((c) => familyIdFor(c.brandId) === f.id).length;
                if (!n) return null;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`lib-chip ${catalogFamily === f.id ? 'active' : ''}`}
                    data-family={f.id}
                    role="tab"
                    aria-selected={catalogFamily === f.id}
                    onClick={() => changeCatalogFamily(f.id)}
                  >
                    {f.label} <span className="lib-chip-n">{n}</span>
                  </button>
                );
              })}
            </div>

            <div className={`lib-grid ${gridAnimate ? 'lib-grid--in' : ''}`} id="lib-grid">
              {liveCatalogs.map((catalog, i) => {
                const brand = brands.find((b) => b.id === catalog.brandId);
                const brandLogo = catalog.logo || brand?.logo || '';
                const cover = catalog.cover || '';
                const sub = catalog.title && catalog.title !== 'Full Line' ? catalog.title : 'Full Line';
                const visible = visibleCatalogs.some((c) => c.id === catalog.id);
                const visibleIndex = visibleCatalogs.findIndex((c) => c.id === catalog.id);

                return (
                  <article
                    key={catalog.id}
                    className="lib-card"
                    data-catalog-id={catalog.id}
                    data-family={familyIdFor(catalog.brandId)}
                    style={{ '--i': visible ? visibleIndex : i }}
                    tabIndex={visible ? 0 : -1}
                    role="button"
                    hidden={!visible}
                    aria-label={`Open ${catalog.name} ${catalog.year} ${sub} catalog`}
                    onClick={() => openCatalog(catalog)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openCatalog(catalog);
                      }
                    }}
                  >
                    <div className="lib-cover">
                      <div className="lib-cover-fallback">
                        {brandLogo ? (
                          <img src={brandLogo} alt={catalog.name} loading="lazy" />
                        ) : (
                          <span>{catalog.name}</span>
                        )}
                      </div>
                      {cover && (
                        <>
                          <div
                            className="lib-cover-blur"
                            style={{ backgroundImage: `url('${cover}')` }}
                          />
                          <img
                            className="lib-cover-img"
                            src={cover}
                            alt={`${catalog.name} ${catalog.year} ${sub} catalog cover`}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.closest('.lib-cover')?.classList.add('lib-cover--nocover');
                            }}
                          />
                        </>
                      )}
                      <div className="lib-hover">
                        <span className="lib-open">
                          Open
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="lib-info">
                      <div className="lib-info-text">
                        <h3 className="lib-brand">{catalog.name}</h3>
                        <p className="lib-title">
                          {sub} <span className="lib-year">· {catalog.year}</span>
                        </p>
                      </div>
                      <span
                        className="lib-format"
                        title={catalog.pdfUrl ? 'PDF document' : 'Interactive flipbook'}
                      >
                        {catalog.pdfUrl ? 'PDF' : 'Flipbook'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="lib-empty" id="lib-empty" hidden={filteredCatalogs.length > 0}>
              No catalogs in this category yet.
            </p>

            <nav
              className="lib-pager"
              id="lib-pager"
              aria-label="Catalog pages"
              hidden={catalogPageCount <= 1}
            >
              <button
                type="button"
                className="lib-pager-arrow"
                id="lib-prev"
                aria-label="Previous page"
                disabled={safeCatalogPage === 1}
                onClick={() => changeCatalogPage(safeCatalogPage - 1)}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="lib-pager-pages" id="lib-pager-pages">
                {Array.from({ length: catalogPageCount }, (_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`lib-page${n === safeCatalogPage ? ' active' : ''}`}
                      data-page={n}
                      aria-label={`Page ${n}`}
                      aria-current={n === safeCatalogPage}
                      onClick={() => changeCatalogPage(n)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="lib-pager-arrow"
                id="lib-next"
                aria-label="Next page"
                disabled={safeCatalogPage === catalogPageCount}
                onClick={() => changeCatalogPage(safeCatalogPage + 1)}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </nav>
          </div>
        </section>

        <section className="section highlights-section" id="categories">
          <div className="section-container">
            <div className="section-header section-header-center">
              <div>
                <h2 className="section-title">
                  See What We <span className="title-cursive title-green">Carry</span>
                </h2>
                <p className="section-subtitle">
                  Real pages from the 2026 lines — actual products, SKUs, and case packs. Click any
                  page to open that catalog right where you left off.
                </p>
              </div>
            </div>

            <div className="hl-rail-wrap">
              <button
                type="button"
                className="hl-nav hl-nav--prev"
                id="hl-prev"
                aria-label="Previous products"
                disabled={hlPrevDisabled}
                onClick={() => hlRailRef.current?.scrollBy({ left: -hlStep(), behavior: 'smooth' })}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className="hl-rail" id="hl-rail" ref={hlRailRef}>
                {productHighlights.map((h, i) => {
                  const catalog = catalogs.find((c) => c.id === h.catalogId);
                  if (!catalog) return null;
                  return (
                    <article
                      key={`${h.catalogId}-${h.page}`}
                      className="hl-card"
                      data-highlight={i}
                      style={{ '--i': i }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open the ${catalog.name} catalog at ${h.label}`}
                      onClick={() => openHighlight(h)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openHighlight(h);
                        }
                      }}
                    >
                      <div className="hl-page">
                        <img
                          src={h.image}
                          alt={`${h.label} — page from the ${catalog.name} ${catalog.year} catalog`}
                          loading="lazy"
                        />
                        <div className="hl-veil">
                          <span className="hl-open">
                            Open in catalog
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <div className="hl-info">
                        <span className="hl-brand">{catalog.name}</span>
                        <h3 className="hl-label">{h.label}</h3>
                      </div>
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                className="hl-nav hl-nav--next"
                id="hl-next"
                aria-label="More products"
                disabled={hlNextDisabled}
                onClick={() => hlRailRef.current?.scrollBy({ left: hlStep(), behavior: 'smooth' })}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        <section className="promo-banner-section">
          <div className="promo-banner" style={{ background: signupBanner.bgColor }}>
            <div className="promo-banner-content">
              <h2>{signupBanner.title}</h2>
              <p>{signupBanner.subtitle}</p>
              {signupLink.startsWith('http') ? (
                <a href={signupLink} className="btn-promo" target="_blank" rel="noopener noreferrer">
                  {signupBanner.cta || 'Sign Up Today'}
                </a>
              ) : (
                <Link href={signupLink} className="btn-promo">
                  {signupBanner.cta || 'Sign Up Today'}
                </Link>
              )}
            </div>
            {signupBanner.image && (
              <div
                className="promo-banner-image"
                style={{ backgroundImage: `url('${signupBanner.image}')` }}
              />
            )}
          </div>
        </section>

        <section className="section promos-section" id="featured">
          <div className="section-container">
            <div className="section-header section-header-center">
              <div>
                <h2 className="section-title">
                  Promos <span className="promo-and-sign">&</span> Specials
                </h2>
                <p className="section-subtitle">
                  Current deals and wholesale pricing from our manufacturers
                </p>
              </div>
            </div>

            <div className="promo-tabs">
              {promoGroups.map((g) => (
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
                  {g.icon}
                  {g.label}
                  <span className="promo-tab-count">{g.deals.length}</span>
                </button>
              ))}
            </div>

            {promoGroups.map((g) => (
              <div
                key={g.id}
                className={`promo-group ${promoTab === g.id ? 'active' : ''}`}
                data-group={g.id}
              >
                <div className="promo-cards">
                  {g.deals.map((deal) => (
                    <div key={`${deal.title}-${deal.brand}`} className="promo-card">
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
                        <Link href="/register" className="btn btn-primary promo-card-cta">
                          Get This Deal
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section brands-section" id="brands">
          <div className="section-container">
            <div className="section-header section-header-center">
              <div>
                <h2 className="section-title">
                  Our <span className="title-cursive">Manufacturers</span>
                </h2>
                <p className="section-subtitle">
                  {brands.length} trusted brands delivering quality toys worldwide
                </p>
              </div>
            </div>
          </div>
          <div className="mfr-ticker">
            <div className="mfr-ticker-track">
              {[...brands, ...brands].map((brand, i) => (
                <Link
                  key={`${brand.id}-${i}`}
                  href={`/brands/${brand.id}`}
                  className="mfr-ticker-item"
                  data-brand={brand.id}
                  aria-hidden={i >= brands.length ? true : undefined}
                >
                  <img
                    src={brand.logo || brand.heroImage}
                    alt={brand.name}
                    className="mfr-ticker-logo"
                  />
                  <span className="mfr-ticker-name">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <div className="section-container">
            <div className="about-layout">
              <div className="about-intro">
                <span className="about-eyebrow">About Toys 2000</span>
                <h2 className="about-headline">
                  The place for <span className="title-cursive title-orange">all things fun.</span>
                </h2>
                <p className="about-lead">
                  We are your trusted sales representative, connecting retailers with top vendors
                  across the toy, outdoor recreation, and sporting goods industries.
                </p>
                <p className="about-lead">
                  Serving the entire Eastern US and Puerto Rico, plus the Caribbean as far east as
                  St. Lucia, we bring the best products directly to you.
                </p>
                <div className="about-cta-row">
                  <a href="mailto:Jim@toys2000.fun" className="btn btn-hero-primary">
                    Get in Touch
                  </a>
                  <a href="tel:+17863670891" className="btn btn-hero-secondary">
                    (786) 367 0891
                  </a>
                </div>
              </div>
              <div className="about-story-card">
                <h3>Spreading Joy Through Every Partnership</h3>
                <p>
                  Toys 2000 has built lasting relationships with top vendors to bring the best
                  selection of toys and recreational products to retailers across the entire Eastern
                  US, Puerto Rico, and the Caribbean as far east as St. Lucia.
                </p>
                <p>
                  Our dedicated team works closely with each retailer to ensure the right products
                  reach the right shelves, helping businesses thrive while bringing smiles to
                  children everywhere.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="site-footer">
        <div className="footer-values">
          <div className="section-container">
            <div className="footer-values-grid">
              <div className="footer-value-item">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                <div>
                  <h4>Dedicated Sales Reps</h4>
                  <p>A team that knows your business and helps you stock the right products.</p>
                </div>
              </div>
              <div className="footer-value-item">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <h4>Eastern US, PR &amp; Caribbean</h4>
                  <p>Serving retailers from the East Coast through Puerto Rico to St. Lucia.</p>
                </div>
              </div>
              <div className="footer-value-item">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div>
                  <h4>Top Vendor Partnerships</h4>
                  <p>Connecting you with leading manufacturers in toys, outdoor rec, and sporting goods.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-main">
          <div className="section-container">
            <div className="footer-grid">
              <div className="footer-brand">
                <div className="footer-logo">
                  <img src="/logos/toys_2000_logo.png" alt="Toys2000" className="footer-logo-img" />
                </div>
                <p className="footer-tagline">
                  Your trusted sales representative connecting retailers with top vendors across the
                  toy, outdoor recreation, and sporting goods industries.
                </p>
              </div>
              <div className="footer-links-col">
                <h4>Explore</h4>
                <a href="#catalogs" onClick={(e) => handleAnchorClick(e, '#catalogs')}>Catalogs</a>
                <a href="#categories" onClick={(e) => handleAnchorClick(e, '#categories')}>What We Carry</a>
                <a href="#featured" onClick={(e) => handleAnchorClick(e, '#featured')}>Promos and Specials</a>
                <Link href="/catalog">Products</Link>
              </div>
              <div className="footer-links-col">
                <h4>Company</h4>
                <a href="#about" onClick={(e) => handleAnchorClick(e, '#about')}>About Us</a>
                <a href="mailto:Jim@toys2000.fun">Contact Us</a>
              </div>
              <div className="footer-links-col">
                <h4>Get in Touch</h4>
                <a href="mailto:Jim@toys2000.fun">Jim@toys2000.fun</a>
                <a href="tel:+17863670891">(786) 367 0891</a>
                <span className="footer-region">Eastern US, PR &amp; Caribbean</span>
              </div>
              <div className="footer-newsletter">
                <h4>Stay in the Loop</h4>
                <p>Get the latest products and deals delivered to your inbox.</p>
                <form className="newsletter-form" id="newsletter-form" onSubmit={handleNewsletter}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="newsletter-input"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary newsletter-btn"
                    style={newsletterDone ? { background: 'var(--accent-color)' } : undefined}
                  >
                    {newsletterDone ? 'Subscribed!' : 'Subscribe'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="section-container">
            <div className="footer-bottom-inner">
              <span>&copy; 2026 Toys2000. All rights reserved.</span>
              <div className="footer-bottom-links">
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
