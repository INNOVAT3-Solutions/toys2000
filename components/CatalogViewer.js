'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen catalog viewer for Flipsnack embeds or local PDFs.
 * Pass a catalog object: { name, catalogUrl (Flipsnack), pdfUrl, logoUrl }
 */
export default function CatalogViewer({ catalog, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef(null);

  const isFlipsnack = !!catalog?.catalogUrl;
  const isPdf = !!catalog?.pdfUrl;
  const src = isFlipsnack ? catalog.catalogUrl : catalog?.pdfUrl;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);

    if (isFlipsnack) {
      timeoutRef.current = setTimeout(() => setTimedOut(true), 6000);
    }

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [catalog, isFlipsnack]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.classList.add('catalog-viewer-open');
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('catalog-viewer-open');
      document.body.style.overflow = '';
    };
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    clearTimeout(timeoutRef.current);
  };

  if (!catalog || !mounted) return null;

  return createPortal(
    <div className="catalog-viewer-root" role="dialog" aria-modal="true" aria-label={catalog?.name || 'Catalog'}>
      <button
        type="button"
        className="catalog-viewer-backdrop"
        onClick={onClose}
        aria-label="Close catalog"
      />

      <div className="catalog-viewer-panel">
        <header className="catalog-viewer-toolbar">
          <button type="button" className="catalog-viewer-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close catalog
          </button>

          <p className="catalog-viewer-title">{catalog?.name || 'Catalog'}</p>

          <p className="catalog-viewer-hint">Press Esc or click outside</p>

          {isPdf && (
            <a href={catalog.pdfUrl} download className="catalog-viewer-download">
              Download PDF
            </a>
          )}
        </header>

        <div className="catalog-viewer-body">
          {!loaded && !timedOut && (
            <div className="catalog-viewer-loading">
              <div className="catalog-viewer-spinner" />
              <p>Loading catalog…</p>
            </div>
          )}

          {timedOut && !loaded && (
            <div className="catalog-viewer-loading">
              <p>The catalog is taking longer than expected.</p>
              {isPdf && (
                <a href={catalog.pdfUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF in new tab
                </a>
              )}
            </div>
          )}

          {src && (
            <iframe
              src={src}
              className="catalog-viewer-frame"
              onLoad={handleLoad}
              allow="fullscreen"
              title={catalog?.name || 'Catalog'}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
