import { data } from '../js/data.js';
import { cart } from '../js/cart.js';
import { router } from '../js/router.js';
import { store } from '../js/state.js';

export function productsView(initialFilters = {}) {
  const container = document.createElement('div');
  container.className = 'products-page animate-fade-in';

  // State management for filters
  const filters = initialFilters || {};
  let activeFilters = {
    search: '',
    brands: filters.brand ? [filters.brand] : [],
    categories: filters.category ? [filters.category] : [],
    catalogs: filters.catalog ? [filters.catalog] : [],
    priceRange: null,
    promotions: (filters.promo ? [filters.promo] : []),
    ...filters
  };

  const allProducts = data.getAllProducts();
  const allBrands = data.brands;

  // Extract unique categories from products
  const uniqueCategories = [...new Set(allProducts.map(p => p.category))].sort();

  const priceRanges = [
    { label: 'Under $50', min: 0, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: '$100 - $250', min: 100, max: 250 },
    { label: '$250+', min: 250, max: 9999 }
  ];

  function getActiveCount(type) {
    if (type === 'priceRange') return activeFilters.priceRange ? 1 : 0;
    return activeFilters[type]?.length || 0;
  }

  function render() {
    container.innerHTML = `
      <div class="products-layout-container">
        <!-- Header -->
        <div class="products-header">
          <div class="products-breadcrumb">
            <a href="#" data-route="/">Home</a> / <span>All Products</span>
          </div>
          <h1 class="products-title">All Products</h1>
          <div class="products-meta" id="products-count-label">
            Showing ${getFilteredProducts().length} products
          </div>
        </div>

        <!-- Horizontal Filter Bar -->
        <div class="filter-bar">
          <div class="filter-bar-left">
            <div class="filter-bar-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" id="filter-search-input" placeholder="Search products..." value="${activeFilters.search}">
            </div>

            <!-- Categories Dropdown -->
            <div class="filter-dropdown" data-filter="categories">
              <button class="filter-dropdown-btn" id="dropdown-categories-btn">
                Categories
                ${getActiveCount('categories') > 0 ? `<span class="filter-badge">${getActiveCount('categories')}</span>` : ''}
                <svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="filter-dropdown-panel" id="dropdown-categories-panel">
                ${uniqueCategories.map(cat => `
                  <label class="filter-dropdown-option">
                    <input type="checkbox" class="category-filter" value="${cat}" ${activeFilters.categories.includes(cat) ? 'checked' : ''}>
                    <span class="filter-dropdown-label">${cat.split('-').join(' ')}</span>
                    <span class="filter-dropdown-count">${allProducts.filter(p => p.category === cat).length}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Brands Dropdown -->
            <div class="filter-dropdown" data-filter="brands">
              <button class="filter-dropdown-btn" id="dropdown-brands-btn">
                Brands
                ${getActiveCount('brands') > 0 ? `<span class="filter-badge">${getActiveCount('brands')}</span>` : ''}
                <svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="filter-dropdown-panel" id="dropdown-brands-panel">
                ${allBrands.map(brand => `
                  <label class="filter-dropdown-option">
                    <input type="checkbox" class="brand-filter" value="${brand.id}" ${activeFilters.brands.includes(brand.id) ? 'checked' : ''}>
                    <span class="filter-dropdown-label">${brand.name}</span>
                    <span class="filter-dropdown-count">${allProducts.filter(p => p.brandId === brand.id).length}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Catalogs Dropdown -->
            <div class="filter-dropdown" data-filter="catalogs">
              <button class="filter-dropdown-btn" id="dropdown-catalogs-btn">
                Catalogs
                ${getActiveCount('catalogs') > 0 ? `<span class="filter-badge">${getActiveCount('catalogs')}</span>` : ''}
                <svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="filter-dropdown-panel" id="dropdown-catalogs-panel">
                ${data.catalogs.map(catalog => `
                  <label class="filter-dropdown-option">
                    <input type="checkbox" class="catalog-filter" value="${catalog.id}" ${activeFilters.catalogs?.includes(catalog.id) ? 'checked' : ''}>
                    <span class="filter-dropdown-label">${catalog.name} ${catalog.year || ''}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Price Range Dropdown -->
            <div class="filter-dropdown" data-filter="priceRange">
              <button class="filter-dropdown-btn" id="dropdown-price-btn">
                Price Range
                ${getActiveCount('priceRange') > 0 ? `<span class="filter-badge">1</span>` : ''}
                <svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="filter-dropdown-panel" id="dropdown-price-panel">
                ${priceRanges.map(range => `
                  <label class="filter-dropdown-option">
                    <input type="radio" name="price-filter" class="price-filter" data-min="${range.min}" data-max="${range.max}" ${activeFilters.priceRange && activeFilters.priceRange.min === range.min ? 'checked' : ''}>
                    <span class="filter-dropdown-label">${range.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Promotions Dropdown -->
            <div class="filter-dropdown" data-filter="promotions">
              <button class="filter-dropdown-btn" id="dropdown-promos-btn">
                Promotions
                ${getActiveCount('promotions') > 0 ? `<span class="filter-badge">${getActiveCount('promotions')}</span>` : ''}
                <svg class="filter-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <div class="filter-dropdown-panel" id="dropdown-promos-panel">
                ${data.promos.map(promo => `
                  <label class="filter-dropdown-option">
                    <input type="checkbox" class="promo-filter" value="${promo.id}" ${activeFilters.promotions?.includes(promo.id) ? 'checked' : ''}>
                    <span class="filter-dropdown-label">${promo.brand} Promo</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <button class="filter-clear-btn" id="clear-filters">Clear All</button>
        </div>

        <!-- Active Filter Tags -->
        ${getActiveTagsHTML()}

        <!-- Products Grid -->
        <div class="products-grid" id="products-grid"></div>
      </div>
    `;

    setupEventListeners();
    updateGrid();
  }

  function getActiveTagsHTML() {
    const tags = [];
    activeFilters.categories.forEach(cat => tags.push({ type: 'categories', value: cat, label: cat.split('-').join(' ') }));
    activeFilters.brands.forEach(brandId => {
      const brand = allBrands.find(b => b.id === brandId);
      if (brand) tags.push({ type: 'brands', value: brandId, label: brand.name });
    });
    activeFilters.catalogs.forEach(catId => {
      const catalog = data.catalogs.find(c => c.id === catId);
      if (catalog) tags.push({ type: 'catalogs', value: catId, label: `${catalog.name} ${catalog.year || ''}` });
    });
    if (activeFilters.priceRange) {
      const range = priceRanges.find(r => r.min === activeFilters.priceRange.min);
      if (range) tags.push({ type: 'priceRange', value: 'price', label: range.label });
    }
    activeFilters.promotions.forEach(promoId => {
      const promo = data.promos.find(p => p.id === promoId);
      if (promo) tags.push({ type: 'promotions', value: promoId, label: `${promo.brand} Promo` });
    });

    if (tags.length === 0) return '';

    return `
      <div class="filter-active-tags" id="filter-active-tags">
        ${tags.map(tag => `
          <span class="filter-tag" data-type="${tag.type}" data-value="${tag.value}">
            ${tag.label}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </span>
        `).join('')}
      </div>
    `;
  }

  function getFilteredProducts() {
    return allProducts.filter(p => {
      const searchTerm = activeFilters.search.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                          p.desc.toLowerCase().includes(searchTerm) ||
                          p.brandName.toLowerCase().includes(searchTerm);
      const matchesCategory = activeFilters.categories.length === 0 || activeFilters.categories.includes(p.category);
      const matchesBrand = activeFilters.brands.length === 0 || activeFilters.brands.includes(p.brandId);
      // Catalog ids are unique per catalog, so map the selected ones back to their
      // brands before matching products (a brand may publish several catalogs).
      const selectedCatalogBrands = activeFilters.catalogs
        .map(cid => data.catalogs.find(c => c.id === cid)?.brandId || cid);
      const matchesCatalog = activeFilters.catalogs.length === 0 || selectedCatalogBrands.includes(p.brandId);
      const matchesPrice = !activeFilters.priceRange || (p.price >= activeFilters.priceRange.min && p.price <= activeFilters.priceRange.max);

      const matchesPromo = activeFilters.promotions.length === 0 ||
                          activeFilters.promotions.some(promoId => {
                            const promo = data.promos.find(pr => pr.id === promoId);
                            return promo && promo.brandId === p.brandId;
                          });

      return matchesSearch && matchesCategory && matchesBrand && matchesCatalog && matchesPrice && matchesPromo;
    });
  }

  function updateGrid() {
    const grid = container.querySelector('#products-grid');
    const filtered = getFilteredProducts();
    const countLabel = container.querySelector('#products-count-label');

    countLabel.textContent = `Showing ${filtered.length} products`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="products-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <h3>No products found</h3>
          <p>Try adjusting your filters or search terms.</p>
          <button class="btn btn-primary" id="reset-filters-empty">Reset All Filters</button>
        </div>
      `;
      container.querySelector('#reset-filters-empty')?.addEventListener('click', clearAll);
      return;
    }

    grid.innerHTML = filtered.map((product, i) => `
      <div class="product-card glass-panel animate-fade-in" style="animation-delay: ${i * 0.05}s">
        <div class="product-image-container">
          ${(() => {
            const hasPromo = data.promos.some(pr => pr.brandId === product.brandId);
            const badge = product.badge || (hasPromo ? 'Special Promo' : '');
            return badge ? `<span class="fp-badge ${hasPromo && !product.badge ? 'fp-badge-promo' : ''}">${badge}</span>` : '';
          })()}
          <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
          <button class="product-quickview-btn" data-product-id="${product.id}" data-brand-id="${product.brandId}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Quick View
          </button>
        </div>
        <div class="product-info">
          <div class="product-brand-tag">${product.brandName}</div>
          <div class="product-title">${product.name}</div>
          <div class="product-price-row">
            <span class="product-price">$${product.price.toFixed(2)}</span>
          </div>
          <div class="product-actions">
            <button class="btn btn-primary add-to-cart-btn" data-product-id="${product.id}" data-brand-id="${product.brandId}">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach card listeners
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === btn.dataset.productId);
        const brand = allBrands.find(b => b.id === btn.dataset.brandId);
        if (product && brand) {
          cart.add(product, brand);
          store.publish('toast', { message: `${product.name} added to cart`, type: 'success' });
        }
      });
    });

    grid.querySelectorAll('.product-quickview-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        store.publish('openQuickView', { productId: btn.dataset.productId, brandId: btn.dataset.brandId });
      });
    });
  }

  function setupEventListeners() {
    // Search
    const searchInput = container.querySelector('#filter-search-input');
    searchInput?.addEventListener('input', (e) => {
      activeFilters.search = e.target.value;
      updateGrid();
    });

    // Dropdown toggle logic
    container.querySelectorAll('.filter-dropdown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = btn.closest('.filter-dropdown');
        const isOpen = dropdown.classList.contains('open');
        // Close all dropdowns first
        container.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
        if (!isOpen) dropdown.classList.add('open');
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        container.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
      }
    });

    // Categories
    container.querySelectorAll('.category-filter').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          activeFilters.categories.push(cb.value);
        } else {
          activeFilters.categories = activeFilters.categories.filter(c => c !== cb.value);
        }
        updateFilterUI();
      });
    });

    // Brands
    container.querySelectorAll('.brand-filter').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          activeFilters.brands.push(cb.value);
        } else {
          activeFilters.brands = activeFilters.brands.filter(b => b !== cb.value);
        }
        updateFilterUI();
      });
    });

    // Catalogs
    container.querySelectorAll('.catalog-filter').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          activeFilters.catalogs.push(cb.value);
        } else {
          activeFilters.catalogs = activeFilters.catalogs.filter(c => c !== cb.value);
        }
        updateFilterUI();
      });
    });

    // Price
    container.querySelectorAll('.price-filter').forEach(radio => {
      radio.addEventListener('change', () => {
        activeFilters.priceRange = {
          min: parseFloat(radio.dataset.min),
          max: parseFloat(radio.dataset.max)
        };
        updateFilterUI();
      });
    });

    // Promotions
    container.querySelectorAll('.promo-filter').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          activeFilters.promotions.push(cb.value);
        } else {
          activeFilters.promotions = activeFilters.promotions.filter(p => p !== cb.value);
        }
        updateFilterUI();
      });
    });

    // Clear Filters
    container.querySelector('#clear-filters')?.addEventListener('click', clearAll);

    // Active tag removal
    container.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const type = tag.dataset.type;
        const value = tag.dataset.value;
        if (type === 'priceRange') {
          activeFilters.priceRange = null;
        } else {
          activeFilters[type] = activeFilters[type].filter(v => v !== value);
        }
        render();
      });
    });

    // Breadcrumb navigation
    container.querySelector('.products-breadcrumb a')?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('/');
    });
  }

  function updateFilterUI() {
    // Update badges on dropdown buttons
    ['categories', 'brands', 'catalogs', 'promotions'].forEach(type => {
      const btn = container.querySelector(`[data-filter="${type}"] .filter-dropdown-btn`);
      if (!btn) return;
      const existingBadge = btn.querySelector('.filter-badge');
      const count = getActiveCount(type);
      if (count > 0) {
        if (existingBadge) {
          existingBadge.textContent = count;
        } else {
          const badge = document.createElement('span');
          badge.className = 'filter-badge';
          badge.textContent = count;
          btn.insertBefore(badge, btn.querySelector('.filter-chevron'));
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    });

    // Update price badge
    const priceBtn = container.querySelector('[data-filter="priceRange"] .filter-dropdown-btn');
    if (priceBtn) {
      const existingBadge = priceBtn.querySelector('.filter-badge');
      if (activeFilters.priceRange) {
        if (!existingBadge) {
          const badge = document.createElement('span');
          badge.className = 'filter-badge';
          badge.textContent = '1';
          priceBtn.insertBefore(badge, priceBtn.querySelector('.filter-chevron'));
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    }

    // Re-render active tags
    const tagsContainer = container.querySelector('#filter-active-tags');
    const newTagsHTML = getActiveTagsHTML();
    if (tagsContainer) {
      if (newTagsHTML) {
        tagsContainer.outerHTML = newTagsHTML;
      } else {
        tagsContainer.remove();
      }
    } else if (newTagsHTML) {
      const grid = container.querySelector('#products-grid');
      grid.insertAdjacentHTML('beforebegin', newTagsHTML);
    }

    // Re-bind tag click events
    container.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const type = tag.dataset.type;
        const value = tag.dataset.value;
        if (type === 'priceRange') {
          activeFilters.priceRange = null;
        } else {
          activeFilters[type] = activeFilters[type].filter(v => v !== value);
        }
        render();
      });
    });

    updateGrid();
  }

  function clearAll() {
    activeFilters = {
      search: '',
      brands: [],
      categories: [],
      catalogs: [],
      priceRange: null,
      promotions: []
    };
    render();
  }

  render();
  return container;
}
