'use client';

import { useEffect, useState } from 'react';
import {
  AD_BANNER_HEIGHT,
  AD_BANNER_WIDTH,
  AD_PLACEHOLDER_SLIDES,
  AD_ROTATION_MS,
} from '@/lib/ad-rails-config';

function AdSlide({ slide, isActive }) {
  return (
    <article
      className={`absolute inset-0 flex flex-col justify-end rounded-2xl overflow-hidden border border-black/[0.08] shadow-sm transition-opacity duration-700 ${
        isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ background: `linear-gradient(180deg, ${slide.accent}22 0%, ${slide.accent} 100%)` }}
      aria-hidden={!isActive}
    >
      <div className="p-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wide opacity-90">Ad space</p>
        <p className="text-sm font-bold leading-tight mt-1">{slide.title}</p>
        <p className="text-[11px] mt-1 opacity-90 leading-snug">{slide.subtitle}</p>
      </div>
    </article>
  );
}

function AdRail({ side }) {
  const [index, setIndex] = useState(0);
  const slides = AD_PLACEHOLDER_SLIDES;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AD_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <aside
      className={`hidden 2xl:block shrink-0 sticky top-24 self-start ${
        side === 'left' ? 'pr-2' : 'pl-2'
      }`}
      style={{ width: AD_BANNER_WIDTH }}
      aria-label={`${side} promotional banner`}
    >
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ width: AD_BANNER_WIDTH, height: AD_BANNER_HEIGHT }}
      >
        {slides.map((slide, slideIndex) => (
          <AdSlide key={slide.id} slide={slide} isActive={slideIndex === index} />
        ))}
      </div>
      <p className="text-[10px] text-center text-[#5f6980] mt-2 leading-snug">
        {AD_BANNER_WIDTH}×{AD_BANNER_HEIGHT}px
      </p>
    </aside>
  );
}

export default function AdRails({ children }) {
  return (
    <div className="2xl:flex 2xl:gap-4 2xl:justify-center 2xl:px-4">
      <AdRail side="left" />
      <div className="min-w-0 flex-1">{children}</div>
      <AdRail side="right" />
    </div>
  );
}
