'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Full-screen catalog viewer for Flipsnack embeds or local PDFs.
 * Pass a catalog object: { name, catalogUrl (Flipsnack), pdfUrl, logoUrl }
 */
export default function CatalogViewer({ catalog, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef(null);

  const isFlipsnack = !!catalog?.catalogUrl;
  const isPdf = !!catalog?.pdfUrl;
  const src = isFlipsnack ? catalog.catalogUrl : catalog?.pdfUrl;

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);

    // 6 second timeout — Flipsnack iframes don't fire load events reliably
    if (isFlipsnack) {
      timeoutRef.current = setTimeout(() => setTimedOut(true), 6000);
    }

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [catalog, isFlipsnack]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    clearTimeout(timeoutRef.current);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 rounded-2xl overflow-hidden bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] bg-white">
          <h2 className="font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            {catalog?.name || 'Catalog'}
          </h2>
          <div className="flex items-center gap-3">
            {isPdf && (
              <a
                href={catalog.pdfUrl}
                download
                className="text-sm font-semibold text-[#00aeef] hover:underline"
              >
                Download PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5f6980] hover:bg-[#f7f8fa] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative">
          {!loaded && !timedOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f8fa]">
              <div className="flex flex-col items-center gap-3 text-[#5f6980]">
                <div className="w-8 h-8 border-2 border-[#f15a24] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Loading catalog…</p>
              </div>
            </div>
          )}

          {timedOut && !loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f8fa]">
              <div className="text-center space-y-3">
                <p className="text-[#5f6980] text-sm">The catalog is taking longer than expected.</p>
                {isPdf && (
                  <a href={catalog.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#00aeef] hover:underline">
                    Open PDF in new tab
                  </a>
                )}
              </div>
            </div>
          )}

          {src && (
            <iframe
              src={src}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              allow="fullscreen"
              title={catalog?.name || 'Catalog'}
            />
          )}
        </div>
      </div>
    </>
  );
}
