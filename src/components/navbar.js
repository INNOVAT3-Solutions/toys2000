import { store } from '../js/state.js';
import { cart } from '../js/cart.js';
import { router } from '../js/router.js';
import { data, resolveCatalog } from '../js/data.js';

export function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  nav.innerHTML = `
    <div class="nav-row">
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>

      <div class="nav-group nav-group-left">
        <a href="#" class="nav-link" data-action="home">Home</a>
        <a href="#" class="nav-link" data-action="catalogs">Catalogs</a>
        <a href="#" class="nav-link" data-action="products">Products</a>
        <a href="#" class="nav-link" data-action="promos">Promos &amp; Specials</a>
      </div>

      <div class="nav-master-logo" role="button" tabindex="0" aria-label="Toys 2000 home">
        <img src="/logos/toys_2000_logo.png" alt="Toys 2000" class="nav-master-logo-img" />
      </div>

      <div class="nav-group nav-group-right">
        <a href="#" class="nav-link" data-action="about">About</a>
        <a href="#" class="nav-link" data-action="contact">Contact</a>
        <a href="#" class="nav-quote-btn" id="nav-quote-btn" data-action="products">
          Order Now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <button class="nav-cart-btn" id="open-cart-btn" aria-label="Cart">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <span class="cart-badge" id="cart-badge">${cart.getItemsCount()}</span>
        </button>
      </div>
    </div>
  `;

  // Mobile menu (separate elements outside the nav pill)
  const mobileOverlay = document.createElement('div');
  mobileOverlay.className = 'mobile-menu-overlay';
  mobileOverlay.id = 'mobile-menu-overlay';

  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'mobile-menu';
  mobileMenu.id = 'mobile-menu';
  mobileMenu.innerHTML = `
    <div class="mobile-menu-header">
      <img src="/logos/toys_2000_logo.png" alt="Toys2000" class="mobile-menu-logo" />
      <button class="mobile-menu-close" id="mobile-menu-close" aria-label="Close menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="mobile-menu-links">
      <a href="#" class="mobile-menu-link" data-action="home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        Home
      </a>
      <a href="#" class="mobile-menu-link" data-action="catalogs">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        Catalogs
      </a>
      <a href="#" class="mobile-menu-link" data-action="products">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/></svg>
        All Products
      </a>
      <a href="#" class="mobile-menu-link" data-action="promos">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
        Promos &amp; Specials
      </a>
      <a href="#" class="mobile-menu-link" data-action="about">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        About
      </a>
      <a href="#" class="mobile-menu-link" data-action="contact">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
        Contact
      </a>
      <div class="mobile-menu-divider"></div>
      <a href="#" class="mobile-menu-link mobile-menu-link-cta" data-action="products">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        Order Now
      </a>
    </div>
  `;

  document.body.appendChild(mobileOverlay);
  document.body.appendChild(mobileMenu);

  // Resolve a nav action against the active brand context
  function handleAction(action) {
    const brandId = store.activeBrandId;
    if (action === 'home') {
      router.navigate('/');
      return;
    }
    if (action === 'catalogs') {
      if (brandId) {
        const catalog = resolveCatalog(brandId);
        if (catalog && (catalog.catalogUrl || catalog.pdfUrl)) {
          store.publish('openCatalog', catalog);
          return;
        }
      }
      router.navigate('/');
      setTimeout(() => {
        const el = document.querySelector('#catalogs');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
      return;
    }
    if (action === 'products') {
      if (brandId) router.navigate('/products', { brand: brandId });
      else router.navigate('/products');
      return;
    }
    if (action === 'promos') {
      if (brandId) {
        store.publish('openBrandPromos', brandId);
      } else {
        router.navigate('/');
        setTimeout(() => {
          const el = document.querySelector('#featured');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      }
      return;
    }
    if (action === 'about') {
      router.navigate('/');
      setTimeout(() => {
        const el = document.querySelector('#about');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
      return;
    }
    if (action === 'contact') {
      window.location.href = 'mailto:Jim@toys2000.fun';
      return;
    }
  }

  // Master logo → reset brand and go home
  const masterLogo = nav.querySelector('.nav-master-logo');
  masterLogo.addEventListener('click', () => {
    store.setActiveBrand(null);
    router.navigate('/');
    closeMobileMenu();
  });
  masterLogo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      store.setActiveBrand(null);
      router.navigate('/');
    }
  });

  // Desktop nav links
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      handleAction(link.dataset.action);
    });
  });

  nav.querySelector('#nav-quote-btn').addEventListener('click', (e) => {
    e.preventDefault();
    handleAction('products');
  });

  // Cart
  nav.querySelector('#open-cart-btn').addEventListener('click', () => {
    store.publish('toggleCart', true);
  });

  // Mobile menu
  const hamburger = nav.querySelector('#nav-hamburger');
  const mobileClose = mobileMenu.querySelector('#mobile-menu-close');

  function openMobileMenu() {
    mobileOverlay.classList.add('active');
    mobileMenu.classList.add('active');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    mobileOverlay.classList.remove('active');
    mobileMenu.classList.remove('active');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMobileMenu);
  mobileOverlay.addEventListener('click', closeMobileMenu);
  mobileClose.addEventListener('click', closeMobileMenu);

  mobileMenu.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const action = link.dataset.action;
      const category = link.dataset.category;
      closeMobileMenu();
      if (category) {
        router.navigate('/');
        setTimeout(() => {
          const el = document.querySelector(`[data-category="${category}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 400);
      } else if (action) {
        handleAction(action);
      }
    });
  });

  // Scroll behavior
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('navbar-scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Cart badge
  store.subscribe('cartUpdated', () => {
    const badge = nav.querySelector('#cart-badge');
    if (badge) {
      const count = cart.getItemsCount();
      badge.textContent = count;
      badge.style.transform = 'scale(1.4)';
      badge.classList.toggle('hidden', count === 0);
      setTimeout(() => badge.style.transform = 'scale(1)', 200);
    }
  });

  return nav;
}
