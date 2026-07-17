import { store } from '../js/state.js';

export function createCatalogViewer() {
  const overlay = document.createElement('div');
  overlay.className = 'catalog-overlay';

  const modal = document.createElement('div');
  modal.className = 'catalog-modal';

  function open(catalog) {
    const hasFlipsnack = !!catalog.catalogUrl;
    const hasPdf = !!catalog.pdfUrl;
    if (!catalog || (!hasFlipsnack && !hasPdf)) return;

    const logoHtml = catalog.logo
      ? `<img src="${catalog.logo}" alt="${catalog.name}" class="catalog-modal-logo" />`
      : '';

    const externalUrl = hasFlipsnack ? catalog.catalogUrl : catalog.pdfUrl;

    modal.innerHTML = `
      <div class="catalog-modal-header">
        <div class="catalog-modal-brand">
          ${logoHtml}
          <div class="catalog-modal-info">
            <h2>${catalog.name}</h2>
            <span class="catalog-modal-year">${catalog.year} ${catalog.title && catalog.title !== 'Full Line' ? catalog.title : ''} Catalog</span>
          </div>
        </div>
        <div class="catalog-modal-actions">
          <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline catalog-open-external">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            ${hasPdf ? 'Download PDF' : 'Open Full Size'}
          </a>
          <button class="catalog-modal-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="catalog-modal-body">
        <div class="catalog-loading">
          <div class="catalog-spinner"></div>
          <span>Loading catalog...</span>
        </div>
        
        <div class="catalog-error-state" id="catalog-error">
          <div class="catalog-error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3>Unable to load interactive viewer</h3>
          <p>Some catalogs have security restrictions for interactive viewing. You can open the full version directly on the provider's official site below.</p>
          <a href="${externalUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="margin-top: 1rem;">
            Open ${catalog.name} Catalog
          </a>
        </div>

        <div class="catalog-embed-container" id="catalog-embed-target"></div>
      </div>
    `;

    const embedTarget = modal.querySelector('#catalog-embed-target');
    const loading = modal.querySelector('.catalog-loading');
    const errorState = modal.querySelector('#catalog-error');

    function showEmbed() {
      loading.style.display = 'none';
      errorState.style.display = 'none';
      embedTarget.classList.add('loaded');
    }

    function showError() {
      loading.style.display = 'none';
      errorState.style.display = 'flex';
      embedTarget.style.display = 'none';
    }

    if (hasFlipsnack) {
      // Flipsnack: create iframe dynamically AFTER modal is visible
      const iframe = document.createElement('iframe');
      iframe.className = 'catalog-iframe';
      iframe.title = `${catalog.name} ${catalog.year} Catalog`;
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('allow', 'autoplay; fullscreen; clipboard-write');
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      
      iframe.addEventListener('load', () => {
        // We can't actually detect x-frame-options errors via 'load' event easily,
        // but we can check if the iframe responded within a reasonable time.
        showEmbed();
      });

      iframe.addEventListener('error', showError);
      embedTarget.appendChild(iframe);

      requestAnimationFrame(() => {
        iframe.src = catalog.catalogUrl;
      });

      // If it doesn't show properly within 6 seconds, show the fallback CTA
      // (This handles the case where the iframe loads but shows a Flipsnack error page)
      const timeoutId = setTimeout(() => {
        if (!embedTarget.classList.contains('loaded')) {
          showError();
        }
      }, 6000);

      // Cleanup
      modal.addEventListener('closeCatalog', () => clearTimeout(timeoutId));
    } else {
      // PDF: use browser's native PDF viewer
      const iframe = document.createElement('iframe');
      iframe.className = 'catalog-iframe';
      iframe.title = `${catalog.name} ${catalog.year} Catalog`;
      iframe.src = catalog.pdfUrl;
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.addEventListener('load', showEmbed);
      iframe.addEventListener('error', showError);
      embedTarget.appendChild(iframe);
      setTimeout(showEmbed, 800);
    }

    modal.querySelector('.catalog-modal-close').addEventListener('click', close);

    overlay.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.dispatchEvent(new CustomEvent('closeCatalog'));
    overlay.classList.remove('active');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    // Clear iframe to stop loading
    setTimeout(() => {
      modal.innerHTML = '';
    }, 350);
  }

  overlay.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      close();
    }
  });

  store.subscribe('openCatalog', (catalog) => {
    open(catalog);
  });

  return { overlay, modal };
}
