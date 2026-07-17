import { data, resolveCatalog, primaryCatalogForBrand, catalogFamilies, familyIdFor, productHighlights, catalogPageUrl } from '../js/data.js';
import { router } from '../js/router.js';
import { cart } from '../js/cart.js';
import { store } from '../js/state.js';

export function homeView() {
  // If a brand is active, render the brand-scoped homepage instead
  if (store.activeBrandId) {
    return brandHomeView(store.activeBrandId);
  }

  const container = document.createElement('div');
  container.className = 'home-page';

  const liveCatalogs = data.catalogs.filter(c => c.catalogUrl || c.pdfUrl);

  container.innerHTML = `
    <!-- ============ HERO ============ -->
    <section class="hero" id="hero">
      <!-- Optional master video layer (falls back to slides if missing) -->
      <video class="hero-video-bg" autoplay muted loop playsinline preload="metadata">
        <source src="/brand-videos/toys-2000.mp4" type="video/mp4" />
      </video>
      <!-- Fullscreen background images -->
      ${data.heroSlides.map((slide, i) => `
        <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
          <div class="hero-slide-bg" style="--bg-wide: url('${slide.image}'); --bg-tall: url('${slide.imagePortrait || slide.image}')"></div>
        </div>
      `).join('')}
      <div class="hero-overlay"></div>

      <!-- Centered content — one block per slide -->
      <div class="hero-center">
        ${data.heroSlides.map((slide, i) => `
          <div class="hero-content ${i === 0 ? 'active' : ''}" data-index="${i}">
            <div class="hero-tag animate-item">${slide.tag}</div>
            <h1 class="hero-headline animate-item">${slide.headline.replace(slide.accentWord, `<span class="hero-accent hero-accent--${slide.textEffect} ${slide.accentClass || ''}">${slide.accentWord}</span>`)}</h1>
            <p class="hero-sub animate-item">${slide.subheadline}</p>
            <div class="hero-ctas">
              <a href="${slide.ctaPrimary.link}" class="btn-hero-primary" data-route="${slide.ctaPrimary.link}" ${slide.ctaPrimary.brand ? `data-brand="${slide.ctaPrimary.brand}"` : ''} ${slide.ctaPrimary.category ? `data-category="${slide.ctaPrimary.category}"` : ''} ${slide.ctaPrimary.catalog ? `data-catalog="${slide.ctaPrimary.catalog}"` : ''}>${slide.ctaPrimary.text}</a>
              <a href="${slide.ctaSecondary.link}" class="btn-hero-secondary" data-route="${slide.ctaSecondary.link}" ${slide.ctaSecondary.brand ? `data-brand="${slide.ctaSecondary.brand}"` : ''} ${slide.ctaSecondary.category ? `data-category="${slide.ctaSecondary.category}"` : ''} ${slide.ctaSecondary.catalog ? `data-catalog="${slide.ctaSecondary.catalog}"` : ''}>${slide.ctaSecondary.text}</a>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Dots + progress -->
      <div class="hero-bottom">
        <div class="hero-dots">
          ${data.heroSlides.map((slide, i) => `
            <button class="hero-dot ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="${slide.tag}">
              <span class="hero-dot-fill"></span>
            </button>
          `).join('')}
        </div>
        <div class="hero-progress">
          <div class="hero-progress-bar" id="hero-progress-bar"></div>
        </div>
      </div>
    </section>

    <div class="main-content-gradient">

    <!-- ============ CATALOG LIBRARY ============ -->
    <section class="section catalog-library" id="catalogs">
      <div class="section-container">
        <div class="lib-header">
          <h2 class="catalog-headline">Browse the Latest Product <span class="title-cursive title-orange">Catalogs</span></h2>
          <p class="catalog-subtext">Every current catalog from our manufacturers — open any cover to flip through full product lines, specs, and pricing without leaving the page.</p>
          <div class="lib-meta">
            <span class="lib-count" id="lib-range">Showing 1–10 of ${liveCatalogs.length}</span>
            <span class="lib-dot"></span>
            <span>${new Set(liveCatalogs.map(c => c.brandId)).size} manufacturers</span>
          </div>
        </div>

        <div class="lib-filters" id="lib-filters" role="tablist">
          <button class="lib-chip active" data-family="all" role="tab" aria-selected="true">
            All <span class="lib-chip-n">${liveCatalogs.length}</span>
          </button>
          ${catalogFamilies.map(f => {
            const n = liveCatalogs.filter(c => familyIdFor(c.brandId) === f.id).length;
            return n ? `<button class="lib-chip" data-family="${f.id}" role="tab" aria-selected="false">
              ${f.label} <span class="lib-chip-n">${n}</span>
            </button>` : '';
          }).join('')}
        </div>

        <div class="lib-grid" id="lib-grid">
          ${liveCatalogs.map((catalog, i) => {
            const brand = data.brands.find(b => b.id === catalog.brandId);
            const brandLogo = catalog.logo || (brand ? brand.logo : '');
            const cover = catalog.cover || '';
            const sub = catalog.title && catalog.title !== 'Full Line' ? catalog.title : 'Full Line';
            return `
            <article class="lib-card" data-catalog-id="${catalog.id}" data-family="${familyIdFor(catalog.brandId)}" style="--i:${i}" tabindex="0" role="button" aria-label="Open ${catalog.name} ${catalog.year} ${sub} catalog">
              <div class="lib-cover">
                <div class="lib-cover-fallback">
                  ${brandLogo ? `<img src="${brandLogo}" alt="${catalog.name}" loading="lazy" />` : `<span>${catalog.name}</span>`}
                </div>
                ${cover
                  ? `<div class="lib-cover-blur" style="background-image:url('${cover}')"></div>
                     <img class="lib-cover-img" src="${cover}" alt="${catalog.name} ${catalog.year} ${sub} catalog cover" loading="lazy"
                          onerror="this.closest('.lib-cover').classList.add('lib-cover--nocover')" />`
                  : ''
                }
                <div class="lib-hover">
                  <span class="lib-open">
                    Open
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
              <div class="lib-info">
                <div class="lib-info-text">
                  <h3 class="lib-brand">${catalog.name}</h3>
                  <p class="lib-title">${sub} <span class="lib-year">· ${catalog.year}</span></p>
                </div>
                <span class="lib-format" title="${catalog.pdfUrl ? 'PDF document' : 'Interactive flipbook'}">${catalog.pdfUrl ? 'PDF' : 'Flipbook'}</span>
              </div>
            </article>`;
          }).join('')}
        </div>

        <p class="lib-empty" id="lib-empty" hidden>No catalogs in this category yet.</p>

        <nav class="lib-pager" id="lib-pager" aria-label="Catalog pages">
          <button class="lib-pager-arrow" id="lib-prev" aria-label="Previous page">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="lib-pager-pages" id="lib-pager-pages"></div>
          <button class="lib-pager-arrow" id="lib-next" aria-label="Next page">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </nav>
      </div>
    </section>

    <!-- ============ PRODUCT HIGHLIGHTS (real catalog pages) ============ -->
    <section class="section highlights-section" id="categories">
      <div class="section-container">
        <div class="section-header section-header-center">
          <div>
            <h2 class="section-title">See What We <span class="title-cursive title-green">Carry</span></h2>
            <p class="section-subtitle">Real pages from the 2026 lines — actual products, SKUs, and case packs. Click any page to open that catalog right where you left off.</p>
          </div>
        </div>

        <div class="hl-rail-wrap">
          <button class="hl-nav hl-nav--prev" id="hl-prev" aria-label="Previous products">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div class="hl-rail" id="hl-rail">
            ${productHighlights.map((h, i) => {
              const catalog = data.catalogs.find(c => c.id === h.catalogId);
              if (!catalog) return '';
              return `
              <article class="hl-card" data-highlight="${i}" style="--i:${i}" tabindex="0" role="button"
                       aria-label="Open the ${catalog.name} catalog at ${h.label}">
                <div class="hl-page">
                  <img src="${h.image}" alt="${h.label} — page from the ${catalog.name} ${catalog.year} catalog" loading="lazy" />
                  <div class="hl-veil">
                    <span class="hl-open">
                      Open in catalog
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </span>
                  </div>
                </div>
                <div class="hl-info">
                  <span class="hl-brand">${catalog.name}</span>
                  <h3 class="hl-label">${h.label}</h3>
                </div>
              </article>`;
            }).join('')}
          </div>

          <button class="hl-nav hl-nav--next" id="hl-next" aria-label="More products">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ============ PROMO BANNER ============ -->
    <section class="promo-banner-section">
      <div class="promo-banner" style="background: ${data.promoBanners[0].bgColor}">
        <div class="promo-banner-content">
          <h2>${data.promoBanners[0].title}</h2>
          <p>${data.promoBanners[0].subtitle}</p>
          <a href="${data.promoBanners[0].link}" class="btn btn-promo">${data.promoBanners[0].cta}</a>
        </div>
        ${data.promoBanners[0].image ? `<div class="promo-banner-image" style="background-image: url('${data.promoBanners[0].image}')"></div>` : ''}
      </div>
    </section>

    <!-- ============ PROMOS & SPECIALS ============ -->
    <section class="section promos-section" id="featured">
      <div class="section-container">
        <div class="section-header section-header-center">
          <div>
            <h2 class="section-title">Promos <span class="promo-and-sign">&</span> Specials</h2>
            <p class="section-subtitle">Current deals and wholesale pricing from our manufacturers</p>
          </div>
        </div>
        ${(() => {
          // Flatten all deals with brand info attached
          const allDeals = data.promos.flatMap(promo => {
            const brand = data.brands.find(b => b.id === promo.brandId);
            const brandLogo = promo.logo || (brand ? brand.logo : '');
            return promo.deals.map(deal => ({ ...deal, brand: promo.brand, brandLogo, image: promo.image }));
          });

          // Group by category
          const groups = [
            {
              id: 'spring',
              label: 'Spring Specials',
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>',
              deals: allDeals.filter(d => /april|may|spring|season/i.test(d.title + d.dates))
            },
            {
              id: 'new-customer',
              label: 'New Customers',
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
              deals: allDeals.filter(d => /new customer|first order/i.test(d.title + d.description + d.badge))
            },
            {
              id: 'shipping',
              label: 'Free Freight',
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
              deals: allDeals.filter(d => /free freight|FFA|free shipping/i.test(d.title + d.discount + d.description) && !/new customer|first order/i.test(d.title + d.badge))
            },
            {
              id: 'volume',
              label: 'Volume Discounts',
              icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
              deals: allDeals.filter(d => /special at|volume|tier|% off/i.test(d.title + d.description) && !/april|new customer|first order/i.test(d.title + d.badge))
            }
          ];

          // Remove empty groups and deduplicate (a deal may match multiple)
          const seen = new Set();
          const cleanGroups = groups.map(g => ({
            ...g,
            deals: g.deals.filter(d => {
              const key = d.title + d.brand;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
          })).filter(g => g.deals.length > 0);

          // Any remaining unmatched deals
          const allKeys = new Set(cleanGroups.flatMap(g => g.deals.map(d => d.title + d.brand)));
          const uncategorized = allDeals.filter(d => !allKeys.has(d.title + d.brand));
          if (uncategorized.length) {
            cleanGroups.push({ id: 'other', label: 'Other Offers', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', deals: uncategorized });
          }

          return `
            <div class="promo-tabs">
              ${cleanGroups.map((g, i) => `
                <button class="promo-tab ${i === 0 ? 'active' : ''}" data-group="${g.id}">
                  ${g.icon}
                  ${g.label}
                  <span class="promo-tab-count">${g.deals.length}</span>
                </button>
              `).join('')}
            </div>
            ${cleanGroups.map((g, i) => `
              <div class="promo-group ${i === 0 ? 'active' : ''}" data-group="${g.id}">
                <div class="promo-cards">
                  ${g.deals.map(deal => `
                    <div class="promo-card">
                      <div class="promo-card-left">
                        <div class="promo-card-brand-row">
                          ${deal.brandLogo ? `<img src="${deal.brandLogo}" alt="${deal.brand}" class="promo-card-logo" />` : ''}
                          <span class="promo-card-brand">${deal.brand}</span>
                          ${deal.badge ? `<span class="promo-card-badge">${deal.badge}</span>` : ''}
                        </div>
                        <h4 class="promo-card-title">${deal.title}</h4>
                        <p class="promo-card-desc">${deal.description}</p>
                        <span class="promo-card-dates">${deal.dates}</span>
                      </div>
                      <div class="promo-card-right">
                        <div class="promo-card-discount">${deal.discount}</div>
                        <div class="promo-card-spend">on ${deal.spend}</div>
                        <button class="btn btn-primary promo-card-cta" data-action="quote">Get This Deal</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          `;
        })()}
      </div>
    </section>

    <!-- ============ MANUFACTURERS TICKER ============ -->
    <section class="section brands-section" id="brands">
      <div class="section-container">
        <div class="section-header section-header-center">
          <div>
            <h2 class="section-title">Our <span class="title-cursive">Manufacturers</span></h2>
            <p class="section-subtitle">${data.brands.length} trusted brands delivering quality toys worldwide</p>
          </div>
        </div>
      </div>
      <div class="mfr-ticker">
        <div class="mfr-ticker-track">
          ${data.brands.map(brand => `
            <div class="mfr-ticker-item" data-brand="${brand.id}">
              <img src="${brand.logo || brand.heroImage}" alt="${brand.name}" class="mfr-ticker-logo" />
              <span class="mfr-ticker-name">${brand.name}</span>
            </div>
          `).concat(data.brands.map(brand => `
            <div class="mfr-ticker-item" aria-hidden="true" data-brand="${brand.id}">
              <img src="${brand.logo || brand.heroImage}" alt="${brand.name}" class="mfr-ticker-logo" />
              <span class="mfr-ticker-name">${brand.name}</span>
            </div>
          `)).join('')}
        </div>
      </div>
    </section>

    <!-- ============ ABOUT ============ -->
    <section class="section about-section" id="about">
      <div class="section-container">
        <div class="about-layout">
          <div class="about-intro">
            <span class="about-eyebrow">About Toys 2000</span>
            <h2 class="about-headline">The place for <span class="title-cursive title-orange">all things fun.</span></h2>
            <p class="about-lead">We are your trusted sales representative, connecting retailers with top vendors across the toy, outdoor recreation, and sporting goods industries.</p>
            <p class="about-lead">Serving the entire Eastern US and Puerto Rico, plus the Caribbean as far east as St. Lucia, we bring the best products directly to you.</p>
            <div class="about-cta-row">
              <a href="mailto:Jim@toys2000.fun" class="btn btn-hero-primary">Get in Touch</a>
              <a href="tel:+17863670891" class="btn btn-hero-secondary">(786) 367 0891</a>
            </div>
          </div>
          <div class="about-story-card">
            <h3>Spreading Joy Through Every Partnership</h3>
            <p>Toys 2000 has built lasting relationships with top vendors to bring the best selection of toys and recreational products to retailers across the entire Eastern US, Puerto Rico, and the Caribbean as far east as St. Lucia.</p>
            <p>Our dedicated team works closely with each retailer to ensure the right products reach the right shelves, helping businesses thrive while bringing smiles to children everywhere.</p>
          </div>
        </div>
      </div>
    </section>

    </div><!-- /.main-content-gradient -->

    <!-- ============ FOOTER ============ -->
    <footer class="site-footer">
      <div class="footer-values">
        <div class="section-container">
          <div class="footer-values-grid">
            <div class="footer-value-item">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              <div>
                <h4>Dedicated Sales Reps</h4>
                <p>A team that knows your business and helps you stock the right products.</p>
              </div>
            </div>
            <div class="footer-value-item">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div>
                <h4>Eastern US, PR &amp; Caribbean</h4>
                <p>Serving retailers from the East Coast through Puerto Rico to St. Lucia.</p>
              </div>
            </div>
            <div class="footer-value-item">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <div>
                <h4>Top Vendor Partnerships</h4>
                <p>Connecting you with leading manufacturers in toys, outdoor rec, and sporting goods.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-main">
        <div class="section-container">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="footer-logo">
                <img src="/logos/toys_2000_logo.png" alt="Toys2000" class="footer-logo-img" />
              </div>
              <p class="footer-tagline">Your trusted sales representative connecting retailers with top vendors across the toy, outdoor recreation, and sporting goods industries.</p>
            </div>
            <div class="footer-links-col">
              <h4>Explore</h4>
              <a href="#catalogs">Catalogs</a>
              <a href="#categories">What We Carry</a>
              <a href="#featured">Promos and Specials</a>
              <a href="#" data-route="/products">Products</a>
            </div>
            <div class="footer-links-col">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="mailto:Jim@toys2000.fun">Contact Us</a>
            </div>
            <div class="footer-links-col">
              <h4>Get in Touch</h4>
              <a href="mailto:Jim@toys2000.fun">Jim@toys2000.fun</a>
              <a href="tel:+17863670891">(786) 367 0891</a>
              <span class="footer-region">Eastern US, PR &amp; Caribbean</span>
            </div>
            <div class="footer-newsletter">
              <h4>Stay in the Loop</h4>
              <p>Get the latest products and deals delivered to your inbox.</p>
              <form class="newsletter-form" id="newsletter-form">
                <input type="email" placeholder="Your email address" class="newsletter-input" required>
                <button type="submit" class="btn btn-primary newsletter-btn">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="section-container">
          <div class="footer-bottom-inner">
            <span>&copy; 2026 Toys2000. All rights reserved.</span>
            <div class="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Wire up interactivity after DOM is built
  requestAnimationFrame(() => {
    // Hide hero video if missing — slides remain visible behind it
    const heroVid = container.querySelector('.hero-video-bg');
    if (heroVid) {
      const hideVid = () => { heroVid.style.display = 'none'; };
      heroVid.addEventListener('error', hideVid);
      heroVid.querySelectorAll('source').forEach(s => s.addEventListener('error', hideVid));
    }

    initHeroCarousel(container);
    initCatalogCarousel(container);
    initCategoryGallery(container);
    initPromosTabs(container);
    initBrandCards(container);
    initAddToCartButtons(container);
    initQuickViewButtons(container);
    initScrollAnimations(container);
    initSmoothAnchors(container);
    initHeroButtons(container);
    initQuoteButtons(container);
    initNewsletterForm(container);
  });

  return container;
}

// ── Hero ──
function initHeroCarousel(container) {
  const slides = container.querySelectorAll('.hero-slide');
  const contents = container.querySelectorAll('.hero-content');
  const dots = container.querySelectorAll('.hero-dot');
  const progressBar = container.querySelector('#hero-progress-bar');

  const total = slides.length;
  let current = 0;
  let autoplayTimer;
  const SLIDE_DURATION = 6000;

  function goToSlide(index) {
    if (index === current) return;
    slides[current].classList.remove('active');
    contents[current].classList.remove('active');
    dots[current].classList.remove('active');

    current = ((index % total) + total) % total;

    slides[current].classList.add('active');
    contents[current].classList.add('active');
    dots[current].classList.add('active');

    startProgress();
  }

  function nextSlide() { goToSlide(current + 1); }

  function startProgress() {
    if (progressBar) {
      progressBar.style.transition = 'none';
      progressBar.style.width = '0%';
      progressBar.offsetWidth;
      progressBar.style.transition = `width ${SLIDE_DURATION}ms linear`;
      progressBar.style.width = '100%';
    }
  }

  function startAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(nextSlide, SLIDE_DURATION);
    startProgress();
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  // Dot clicks
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(parseInt(dot.dataset.slide));
      resetAutoplay();
    });
  });

  // Touch/swipe
  let touchStartX = 0;
  const hero = container.querySelector('.hero');
  if (hero) {
    hero.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(current + 1); else goToSlide(current - 1);
        resetAutoplay();
      }
    }, { passive: true });
  }

  startAutoplay();
}

// ── Hero Buttons (Filtering & Routing) ──
function initHeroButtons(container) {
  container.querySelectorAll('.btn-hero-primary, .btn-hero-secondary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const route = btn.dataset.route;
      const category = btn.dataset.category;
      const brand = btn.dataset.brand;
      const catalogId = btn.dataset.catalog;

      // Open a manufacturer catalog directly when one is wired up.
      // Hero CTAs pass a brand id here, so resolve either form.
      if (catalogId) {
        const catalog = resolveCatalog(catalogId);
        if (catalog && (catalog.catalogUrl || catalog.pdfUrl)) {
          e.preventDefault();
          store.publish('openCatalog', catalog);
          return;
        }
      }

      if (route && route.startsWith('#')) {
        // Smooth scroll handled by initSmoothAnchors via href
        return;
      }

      if (route) {
        e.preventDefault();
        if (route === '/brand' && brand) {
          store.setActiveBrand(brand);
          router.navigate('/');
        } else if (route === '/products' && brand) {
          router.navigate('/products', { brand });
        } else if (route === '/products' && category) {
          router.navigate('/products', { category });
        } else {
          router.navigate(route);
        }
      }
    });
  });
}

// ── Category Interactive Gallery ──
// ── Product Highlights ──
// Each tile is a real catalog page; opening one deep-links the viewer to that page.
function initCategoryGallery(container) {
  const rail = container.querySelector('#hl-rail');
  if (!rail) return;

  const cards = [...rail.querySelectorAll('.hl-card')];
  const prev = container.querySelector('#hl-prev');
  const next = container.querySelector('#hl-next');

  const open = (card) => {
    const h = productHighlights[Number(card.dataset.highlight)];
    const catalog = data.catalogs.find(c => c.id === h.catalogId);
    if (!catalog) return;
    // Hand the viewer a catalog pointed at this page rather than page one.
    const url = catalogPageUrl(catalog, h.page);
    store.publish('openCatalog', catalog.pdfUrl
      ? { ...catalog, pdfUrl: url }
      : { ...catalog, catalogUrl: url });
  };

  cards.forEach(card => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });

  const step = () => {
    const card = cards[0];
    if (!card) return rail.clientWidth;
    const gap = parseInt(getComputedStyle(rail).gap) || 20;
    return (card.offsetWidth + gap) * 2;
  };

  // scroll-snap plus the rail's own inline padding parks scrollLeft a few px off
  // zero at rest, so the end checks need a tolerance rather than an exact 0.
  const EDGE_SLOP = 12;

  const sync = () => {
    const max = rail.scrollWidth - rail.clientWidth - EDGE_SLOP;
    prev.disabled = rail.scrollLeft <= EDGE_SLOP;
    next.disabled = rail.scrollLeft >= max;
  };

  prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  rail.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
}

// ── Promos Tabs ──
function initPromosTabs(container) {
  const tabs = container.querySelectorAll('.promo-tab');
  const groups = container.querySelectorAll('.promo-group');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.group;
      tabs.forEach(t => t.classList.remove('active'));
      groups.forEach(g => g.classList.remove('active'));
      tab.classList.add('active');
      const group = container.querySelector(`.promo-group[data-group="${target}"]`);
      if (group) group.classList.add('active');
      // Scroll tab into view on mobile
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });

  // Quote buttons inside promo cards
  container.querySelectorAll('.promo-card-cta').forEach(btn => {
    btn.addEventListener('click', () => {
      store.publish('openQuoteModal');
    });
  });
}

// ── Catalog Library ──
const CATALOGS_PER_PAGE = 10;

function initCatalogCarousel(container) {
  const grid = container.querySelector('#lib-grid');
  if (!grid) return;

  const cards = [...grid.querySelectorAll('.lib-card')];
  const chips = [...container.querySelectorAll('.lib-chip')];
  const range = container.querySelector('#lib-range');
  const empty = container.querySelector('#lib-empty');
  const pager = container.querySelector('#lib-pager');
  const pagesEl = container.querySelector('#lib-pager-pages');
  const prevBtn = container.querySelector('#lib-prev');
  const nextBtn = container.querySelector('#lib-next');
  const section = container.querySelector('#catalogs');

  let family = 'all';
  let page = 1;

  const matching = () => cards.filter(c => family === 'all' || c.dataset.family === family);

  function render({ scroll = false } = {}) {
    const list = matching();
    const pageCount = Math.max(1, Math.ceil(list.length / CATALOGS_PER_PAGE));
    page = Math.min(Math.max(1, page), pageCount);

    const start = (page - 1) * CATALOGS_PER_PAGE;
    const slice = list.slice(start, start + CATALOGS_PER_PAGE);

    cards.forEach(c => { c.hidden = true; });
    slice.forEach((c, i) => { c.hidden = false; c.style.setProperty('--i', i); });

    if (range) {
      range.textContent = list.length
        ? `Showing ${start + 1}–${start + slice.length} of ${list.length}`
        : 'No catalogs';
    }
    if (empty) empty.hidden = list.length > 0;

    // A single page needs no pager
    pager.hidden = pageCount <= 1;
    pagesEl.innerHTML = Array.from({ length: pageCount }, (_, i) => {
      const n = i + 1;
      return `<button class="lib-page${n === page ? ' active' : ''}" data-page="${n}"
                aria-label="Page ${n}" aria-current="${n === page}">${n}</button>`;
    }).join('');
    pagesEl.querySelectorAll('.lib-page').forEach(b => {
      b.addEventListener('click', () => { page = Number(b.dataset.page); render({ scroll: true }); });
    });

    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === pageCount;

    // Replay the stagger on the new set
    grid.classList.remove('lib-grid--in');
    void grid.offsetWidth;
    grid.classList.add('lib-grid--in');

    // Only pull the viewport back on an explicit page/filter change, never on first paint
    if (scroll && section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const open = (card) => {
    const catalog = data.catalogs.find(c => c.id === card.dataset.catalogId);
    if (catalog && (catalog.catalogUrl || catalog.pdfUrl)) store.publish('openCatalog', catalog);
  };

  cards.forEach(card => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      family = chip.dataset.family;
      page = 1; // a new filter always starts at page 1
      chips.forEach(c => {
        const on = c === chip;
        c.classList.toggle('active', on);
        c.setAttribute('aria-selected', String(on));
      });
      render({ scroll: true });
    });
  });

  prevBtn.addEventListener('click', () => { page--; render({ scroll: true }); });
  nextBtn.addEventListener('click', () => { page++; render({ scroll: true }); });

  render();
}

// ── Brand Card Clicks ──
function initBrandCards(container) {
  container.querySelectorAll('.mfr-ticker-item').forEach(card => {
    card.addEventListener('click', () => {
      router.navigate('/brand', card.dataset.brand);
    });
  });
}

// ── Add to Cart from Featured Products ──
function initAddToCartButtons(container) {
  container.querySelectorAll('.fp-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.dataset.productId;
      const brandId = btn.dataset.brandId;
      const brand = data.brands.find(b => b.id === brandId);
      const products = data.products[brandId] || [];
      const product = products.find(p => p.id === productId);
      if (product && brand) {
        cart.add(product, brand);
        store.publish('toast', { message: `${product.name} added to cart`, type: 'success' });
      }
    });
  });
}

// ── Quick View ──
function initQuickViewButtons(container) {
  container.querySelectorAll('.fp-quick-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.publish('openQuickView', {
        productId: btn.dataset.productId,
        brandId: btn.dataset.brandId
      });
    });
  });
}

// ── Scroll-triggered Animations ──
function initScrollAnimations(container) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  container.querySelectorAll('.section, .trust-item, .bento-card, .promo-card, .vendor-logos-section, .about-grid').forEach(el => {
    observer.observe(el);
  });
}

// ── Smooth Anchor Links ──
function initSmoothAnchors(container) {
  container.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = container.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}



// ── Quote buttons ──
function initQuoteButtons(container) {
  container.querySelectorAll('[data-action="quote"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      store.publish('openQuoteModal');
    });
  });
}

// ── Brand-scoped Homepage ──
function brandHomeView(brandId) {
  const brand = data.brands.find(b => b.id === brandId);
  const container = document.createElement('div');
  container.className = 'home-page brand-home-page';

  if (!brand) {
    container.innerHTML = `<div style="padding:260px 24px;text-align:center;"><h2>Brand not found</h2></div>`;
    return container;
  }

  const catalog = primaryCatalogForBrand(brandId);
  const promo = data.promos.find(p => p.brandId === brandId);
  const products = data.products[brandId] || [];
  const bestSellers = products.filter(p => p.badge);
  const showcase = bestSellers.length ? bestSellers : products;
  const heroImage = brand.heroImage || (brand.images && brand.images[0]) || '';
  const brandLogo = brand.logo || (catalog && catalog.logo) || '';
  const galleryImages = [brand.heroImage, ...(brand.images || [])].filter(Boolean).slice(0, 6);
  const featured = showcase[0];

  // Categories within this brand (derived from its product list)
  const brandCategoryIds = [...new Set(products.map(p => p.category))];
  const brandCategories = brandCategoryIds.map(catId => {
    const catProducts = products.filter(p => p.category === catId);
    return {
      id: catId,
      label: catId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      count: catProducts.length,
      image: catProducts[0]?.image || heroImage,
    };
  });

  // Sister brands — same primary category
  const siblings = data.brands
    .filter(b => b.id !== brand.id && b.category === brand.category)
    .slice(0, 6);

  // Stats — synthesized from real data
  const stats = [
    { value: products.length || '20+', label: 'Products in lineup' },
    { value: promo ? promo.deals.length : '—', label: 'Active promotions' },
    { value: catalog ? '1' : '—', label: 'Catalog available' },
    { value: brand.featured ? 'Featured' : 'Partner', label: 'Brand status' },
  ];

  container.innerHTML = `
    <!-- ============ BRAND HERO ============ -->
    <section class="brand-home-hero">
      <div class="brand-home-hero-media">
        <img src="${heroImage}" alt="" class="brand-home-hero-poster" aria-hidden="true" />
        ${brand.heroVideo ? `
          <video class="brand-home-hero-video" autoplay muted loop playsinline preload="metadata" poster="${heroImage}">
            <source src="${brand.heroVideo}" type="video/mp4" />
          </video>
        ` : ''}
      </div>
      <div class="brand-home-hero-overlay"></div>
      <div class="brand-home-hero-content">
        ${brandLogo ? `<img src="${brandLogo}" alt="${brand.name}" class="brand-home-hero-logo" />` : `<h1 class="brand-home-hero-title">${brand.name}</h1>`}
        <span class="brand-home-hero-tagline">${brand.tagline || ''}</span>
        <p class="brand-home-hero-desc">${brand.description || ''}</p>
        <div class="brand-home-hero-ctas">
          <button class="btn-hero-primary" data-bh-action="products">Shop ${brand.name}</button>
          ${(catalog && (catalog.catalogUrl || catalog.pdfUrl))
            ? `<button class="btn-hero-secondary" data-bh-action="catalog">View ${catalog.year || ''} Catalog</button>`
            : ''}
          ${promo ? `<button class="btn-hero-secondary" data-bh-action="promos">See Promos</button>` : ''}
        </div>
      </div>
      <div class="brand-home-hero-scroll" aria-hidden="true">
        <span></span>
      </div>
    </section>

    <!-- ============ BRAND SUB-NAV ============ -->
    <div class="brand-subnav">
      <div class="brand-subnav-inner">
        <a href="#best-sellers" class="brand-subnav-link" data-scroll="best-sellers">Best Sellers</a>
        ${brandCategories.length ? `<a href="#categories" class="brand-subnav-link" data-scroll="categories">Categories</a>` : ''}
        <a href="#brand-story" class="brand-subnav-link" data-scroll="brand-story">About ${brand.name}</a>
        ${promo ? `<a href="#brand-promos" class="brand-subnav-link" data-scroll="brand-promos">Promos</a>` : ''}
        ${(catalog && (catalog.catalogUrl || catalog.pdfUrl)) ? `<a href="#brand-catalog" class="brand-subnav-link" data-scroll="brand-catalog">Catalog</a>` : ''}
        ${siblings.length ? `<a href="#brand-related" class="brand-subnav-link" data-scroll="brand-related">Related Brands</a>` : ''}
      </div>
    </div>

    <div class="main-content-gradient">

      <!-- ============ STATS STRIP ============ -->
      <section class="brand-stats-strip">
        ${stats.map(s => `
          <div class="brand-stat">
            <span class="brand-stat-value">${s.value}</span>
            <span class="brand-stat-label">${s.label}</span>
          </div>
        `).join('')}
      </section>

      ${featured ? `
      <!-- ============ FEATURED PRODUCT SPOTLIGHT ============ -->
      <section class="section brand-home-section brand-spotlight-section">
        <div class="section-container">
          <div class="brand-spotlight">
            <div class="brand-spotlight-image" style="background-image: url('${featured.image}')">
              ${featured.badge ? `<span class="brand-spotlight-badge">${featured.badge}</span>` : ''}
            </div>
            <div class="brand-spotlight-info">
              <span class="brand-spotlight-eyebrow">Featured Product</span>
              <h2 class="brand-spotlight-title">${featured.name}</h2>
              <p class="brand-spotlight-desc">${featured.desc}</p>
              <div class="brand-spotlight-pricing">
                <span class="brand-spotlight-price">$${featured.price.toFixed(2)}</span>
                <span class="brand-spotlight-price-note">wholesale unit price</span>
              </div>
              <div class="brand-spotlight-ctas">
                <button class="btn btn-primary fp-add-cart" data-product-id="${featured.id}" data-brand-id="${brand.id}">Add to Cart</button>
                <button class="btn btn-outline fp-quick-view" data-product-id="${featured.id}" data-brand-id="${brand.id}">Quick View</button>
              </div>
            </div>
          </div>
        </div>
      </section>` : ''}

      <!-- ============ BEST SELLERS ============ -->
      <section class="section brand-home-section" id="best-sellers">
        <div class="section-container">
          <div class="section-header section-header-center">
            <div>
              <h2 class="section-title">${brand.name} <span class="title-cursive title-orange">Best Sellers</span></h2>
              <p class="section-subtitle">Top-performing products from ${brand.name} this season.</p>
            </div>
          </div>
          ${showcase.length === 0 ? `
            <div class="brand-home-empty">
              <p>Product list coming soon. Reach out to your sales rep for the full ${brand.name} lineup.</p>
              <button class="btn btn-primary" data-bh-action="products">Browse All Products</button>
            </div>
          ` : `
            <div class="brand-home-products">
              ${showcase.map((p, i) => `
                <div class="product-card glass-panel" style="animation-delay:${i * 0.05}s">
                  <div class="product-image-container">
                    ${p.badge ? `<span class="fp-badge">${p.badge}</span>` : ''}
                    <img src="${p.image}" alt="${p.name}" class="product-image" loading="lazy">
                    <button class="product-quickview-btn fp-quick-view" data-product-id="${p.id}" data-brand-id="${brand.id}">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      Quick View
                    </button>
                  </div>
                  <div class="product-info">
                    <div class="product-brand-tag">${brand.name}</div>
                    <div class="product-title">${p.name}</div>
                    <div class="product-price-row">
                      <span class="product-price">$${p.price.toFixed(2)}</span>
                    </div>
                    <div class="product-actions">
                      <button class="btn btn-primary fp-add-cart" data-product-id="${p.id}" data-brand-id="${brand.id}">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="brand-section-cta">
              <button class="btn btn-outline" data-bh-action="products">See All ${brand.name} Products</button>
            </div>
          `}
        </div>
      </section>

      ${brandCategories.length ? `
      <!-- ============ SHOP BY BRAND CATEGORY ============ -->
      <section class="section brand-home-section" id="categories">
        <div class="section-container">
          <div class="section-header section-header-center">
            <div>
              <h2 class="section-title">Shop by <span class="title-cursive title-green">Category</span></h2>
              <p class="section-subtitle">Browse the ${brand.name} lineup by product type.</p>
            </div>
          </div>
          <div class="brand-category-grid">
            ${brandCategories.map(cat => `
              <button class="brand-category-tile" data-bh-category="${cat.id}">
                <div class="brand-category-tile-img" style="background-image: url('${cat.image}')"></div>
                <div class="brand-category-tile-overlay"></div>
                <div class="brand-category-tile-content">
                  <h3>${cat.label}</h3>
                  <span class="brand-category-tile-count">${cat.count} ${cat.count === 1 ? 'product' : 'products'}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      </section>` : ''}

      <!-- ============ BRAND STORY ============ -->
      <section class="section brand-home-section brand-story-section" id="brand-story">
        <div class="section-container">
          <div class="brand-story-grid">
            <div class="brand-story-text">
              <span class="brand-story-eyebrow">About the brand</span>
              <h2 class="brand-story-headline">Why retailers choose <span class="title-cursive title-orange">${brand.name}</span></h2>
              <p>${brand.description}</p>
              <p>Toys 2000 stocks the full ${brand.name} lineup with wholesale pricing, dedicated rep support, and freight programs that work for resorts, gift shops, and specialty retailers across the Eastern US, Puerto Rico, and the Caribbean.</p>
              <ul class="brand-story-features">
                <li><strong>Trusted partner</strong> — long-standing distribution relationship</li>
                <li><strong>Stocked inventory</strong> — fast turnaround on reorders</li>
                <li><strong>Promo-eligible</strong> — current Market Time specials apply</li>
              </ul>
              <div class="brand-story-ctas">
                <button class="btn btn-primary" data-bh-action="products">Browse ${brand.name}</button>
                <a href="mailto:Jim@toys2000.fun?subject=${encodeURIComponent(brand.name + ' inquiry')}" class="btn btn-outline">Talk to a Rep</a>
              </div>
            </div>
            <div class="brand-story-visual">
              ${galleryImages.slice(0, 4).map((src, i) => `
                <div class="brand-story-tile brand-story-tile--${i}" style="background-image:url('${src}')"></div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>

      ${promo ? `
      <!-- ============ MARKET-TIME PROMOS ============ -->
      <section class="section brand-home-section" id="brand-promos">
        <div class="section-container">
          <div class="section-header section-header-center">
            <div>
              <h2 class="section-title">${brand.name} <span class="promo-and-sign">&</span> Market Time Specials</h2>
              <p class="section-subtitle">Current deals and incentives running for ${brand.name}.</p>
            </div>
          </div>
          <div class="brand-home-promos">
            ${promo.deals.map(deal => `
              <div class="promo-card">
                <div class="promo-card-left">
                  <div class="promo-card-brand-row">
                    ${brandLogo ? `<img src="${brandLogo}" alt="${brand.name}" class="promo-card-logo" />` : ''}
                    <span class="promo-card-brand">${brand.name}</span>
                    ${deal.badge ? `<span class="promo-card-badge">${deal.badge}</span>` : ''}
                  </div>
                  <h4 class="promo-card-title">${deal.title}</h4>
                  <p class="promo-card-desc">${deal.description}</p>
                  <span class="promo-card-dates">${deal.dates}</span>
                </div>
                <div class="promo-card-right">
                  <div class="promo-card-discount">${deal.discount}</div>
                  <div class="promo-card-spend">on ${deal.spend}</div>
                  <button class="btn btn-primary promo-card-cta" data-action="quote">Get This Deal</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>` : ''}

      ${(catalog && (catalog.catalogUrl || catalog.pdfUrl)) ? `
      <!-- ============ CATALOG SPOTLIGHT ============ -->
      <section class="section brand-home-section" id="brand-catalog">
        <div class="section-container">
          <div class="brand-catalog-cta" style="background-image: url('${heroImage}')">
            <div class="brand-catalog-cta-overlay"></div>
            <div class="brand-catalog-cta-content">
              <span class="brand-catalog-cta-eyebrow">${catalog.year || 'Latest'} Catalog</span>
              <h2>The complete ${brand.name} ${catalog.year || ''} lineup</h2>
              <p>Flip through the full product line, specs, and wholesale pricing.</p>
              <button class="btn-hero-primary" data-bh-action="catalog">Open the Catalog</button>
            </div>
          </div>
        </div>
      </section>` : ''}

      ${siblings.length ? `
      <!-- ============ RELATED BRANDS ============ -->
      <section class="section brand-home-section" id="brand-related">
        <div class="section-container">
          <div class="section-header section-header-center">
            <div>
              <h2 class="section-title">You Might Also Like</h2>
              <p class="section-subtitle">Other brands in the ${brand.category.split('-').join(' ')} category.</p>
            </div>
          </div>
          <div class="brand-related-grid">
            ${siblings.map(s => `
              <button class="brand-related-card" data-bh-switch="${s.id}">
                <div class="brand-related-card-img" style="background-image: url('${s.heroImage}')"></div>
                <div class="brand-related-card-body">
                  ${s.logo ? `<img src="${s.logo}" alt="${s.name}" class="brand-related-card-logo" />` : `<h4>${s.name}</h4>`}
                  <p>${s.tagline || ''}</p>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      </section>` : ''}

    </div><!-- /.main-content-gradient -->

    <!-- Footer -->
    <footer class="site-footer">
      <div class="footer-bottom">
        <div class="section-container">
          <div class="footer-bottom-inner">
            <span>&copy; 2026 Toys2000. All rights reserved.</span>
            <div class="footer-bottom-links">
              <a href="#" data-bh-action="home">Back to Toys 2000 Home</a>
              <a href="mailto:Jim@toys2000.fun">Contact Sales</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `;

  // Wire up actions
  requestAnimationFrame(() => {
    // Hide video if it fails to load (poster image stays visible)
    const heroVideo = container.querySelector('.brand-home-hero-video');
    if (heroVideo) {
      const hideVideo = () => { heroVideo.style.display = 'none'; };
      heroVideo.addEventListener('error', hideVideo);
      heroVideo.querySelectorAll('source').forEach(s => s.addEventListener('error', hideVideo));
    }

    container.querySelectorAll('[data-bh-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.bhAction;
        if (action === 'products') {
          router.navigate('/products', { brand: brand.id });
        } else if (action === 'catalog' && catalog) {
          store.publish('openCatalog', catalog);
        } else if (action === 'promos') {
          store.publish('openBrandPromos', brand.id);
        } else if (action === 'home') {
          store.setActiveBrand(null);
          router.navigate('/');
        }
      });
    });

    // Brand-category tile -> products page filtered by brand + category
    container.querySelectorAll('[data-bh-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        router.navigate('/products', { brand: brand.id, category: btn.dataset.bhCategory });
      });
    });

    // Sister brand switching
    container.querySelectorAll('[data-bh-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        store.setActiveBrand(btn.dataset.bhSwitch);
        router.navigate('/');
      });
    });

    // Sub-nav smooth scroll
    container.querySelectorAll('[data-scroll]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = container.querySelector(`#${link.dataset.scroll}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Add to cart
    container.querySelectorAll('.fp-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = (data.products[btn.dataset.brandId] || []).find(p => p.id === btn.dataset.productId);
        if (product) {
          cart.add(product, brand);
          store.publish('toast', { message: `${product.name} added to cart`, type: 'success' });
        }
      });
    });

    // Quick view
    container.querySelectorAll('.fp-quick-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.publish('openQuickView', {
          productId: btn.dataset.productId,
          brandId: btn.dataset.brandId
        });
      });
    });

    // Inline quote buttons inside promos
    container.querySelectorAll('[data-action="quote"]').forEach(el => {
      el.addEventListener('click', () => store.publish('openQuoteModal'));
    });
  });

  return container;
}

// ── Newsletter form ──
function initNewsletterForm(container) {
  const form = container.querySelector('#newsletter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.newsletter-btn');
      btn.textContent = 'Subscribed!';
      btn.style.background = 'var(--accent-color)';
      store.publish('toast', { message: 'Successfully subscribed to our newsletter!', type: 'success' });
      setTimeout(() => {
        btn.textContent = 'Subscribe';
        btn.style.background = '';
        form.reset();
      }, 3000);
    });
  }
}
