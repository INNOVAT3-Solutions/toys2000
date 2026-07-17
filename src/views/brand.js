import { data, primaryCatalogForBrand } from '../js/data.js';
import { cart } from '../js/cart.js';
import { router } from '../js/router.js';
import { store } from '../js/state.js';

export function brandView(brandId) {
  const brand = data.brands.find(b => b.id === brandId);
  const products = data.products[brandId] || [];
  const catalog = primaryCatalogForBrand(brandId);

  if (!brand) {
    router.navigate('/');
    return document.createTextNode('');
  }

  const container = document.createElement('div');
  container.className = 'brand-container animate-fade-in';

  container.innerHTML = `
    <div class="brand-hero">
      ${brand.heroVideo
        ? `<video class="hero-video" autoplay loop muted playsinline>
            <source src="${brand.heroVideo}" type="video/mp4" />
           </video>`
        : `<div class="hero-video" style="background-image: url('${brand.heroImage}'); background-size: cover; background-position: center;"></div>`
      }
      <div class="hero-overlay"></div>
      <div class="hero-content animate-fade-in">
        <button class="brand-back-btn" id="brand-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          All Brands
        </button>
        <span class="brand-hero-tagline">${brand.tagline}</span>
        <h1>${brand.name}</h1>
        <p>${brand.description}</p>
        <div class="brand-hero-actions">
          <button class="btn btn-hero-primary" id="brand-view-catalog">
            ${(catalog && catalog.catalogUrl) ? 'View Digital Catalog' : `View Catalog (${products.length} products)`}
          </button>
          <button class="btn btn-hero-secondary" data-action="quote">
            Request Wholesale Quote
          </button>
        </div>
      </div>
    </div>

    ${(catalog && catalog.catalogUrl) ? `
      <div class="catalog-embed-section" id="catalog-embed" style="padding: 60px 20px 20px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box;">
        <div class="products-section-header">
          <h2>${brand.name} ${catalog.year || ''} Catalog</h2>
          <span class="products-count">Scroll to view pages</span>
        </div>
        <div class="catalog-iframe-container" style="position: relative; padding-bottom: 60%; height: 0; overflow: hidden; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.15); border: 1px solid var(--glass-border); background: #fdfdfd; width: 100%;">
          <iframe 
            src="${catalog.catalogUrl}" 
            seamless="seamless" 
            scrolling="no" 
            frameborder="0" 
            allowfullscreen 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
          ></iframe>
        </div>
      </div>
    ` : ''}

    <div class="products-section" id="products" style="max-width: 1400px; margin: 0 auto; padding: 40px 20px; width: 100%; box-sizing: border-box;">
      <div class="products-section-header">
        <h2>${brand.name} Products</h2>
        <span class="products-count">${products.length} product${products.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="products-grid">
        ${products.length > 0 ? '' : `
          <div class="products-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg>
            <p>No products loaded for this brand yet.</p>
            <button class="btn btn-outline" data-action="quote">Request Info</button>
          </div>
        `}
      </div>
    </div>
  `;

  const grid = container.querySelector('.products-grid');

  products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card glass-panel';
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <div class="product-image-container">
        ${product.badge ? `<span class="fp-badge">${product.badge}</span>` : ''}
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <button class="product-quickview-btn" data-product-id="${product.id}" data-brand-id="${brand.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Quick View
        </button>
      </div>
      <div class="product-info">
        <div class="product-title">${product.name}</div>
        <div class="product-price-row">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <span class="product-bulk-price">From $${(product.price * 0.8).toFixed(2)}/ea in bulk</span>
        </div>
        <div class="product-desc">${product.desc}</div>
        <div class="product-actions">
          <button class="btn btn-primary add-to-cart-btn" data-id="${product.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            Add to Cart
          </button>
          <button class="btn btn-outline product-quote-btn" data-action="quote">Quote</button>
        </div>
      </div>
    `;

    card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      cart.add(product, brand);
      store.publish('toast', { message: `${product.name} added to cart`, type: 'success' });
    });

    card.querySelector('.product-quickview-btn').addEventListener('click', () => {
      store.publish('openQuickView', { productId: product.id, brandId: brand.id });
    });

    card.querySelectorAll('[data-action="quote"]').forEach(el => {
      el.addEventListener('click', () => {
        store.publish('openQuoteModal', { product: product.name, brand: brand.name, qty: '1' });
      });
    });

    grid.appendChild(card);
  });

  requestAnimationFrame(() => {
    container.querySelector('#brand-back')?.addEventListener('click', () => router.navigate('/'));

    container.querySelector('#brand-view-catalog')?.addEventListener('click', () => {
      const target = document.getElementById('catalog-embed') || document.getElementById('products');
      target?.scrollIntoView({ behavior: 'smooth' });
    });

    container.querySelectorAll('[data-action="quote"]').forEach(el => {
      el.addEventListener('click', () => {
        store.publish('openQuoteModal', { product: '', brand: brand.name, qty: '' });
      });
    });

    // Scroll animations for product cards
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    grid.querySelectorAll('.product-card').forEach(el => observer.observe(el));
  });

  return container;
}
