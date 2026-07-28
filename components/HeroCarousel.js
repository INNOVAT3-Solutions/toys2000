'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SLIDES = [
  {
    tag: 'Water Fun',
    headline: 'Where Every',
    accentWord: 'Splash',
    subheadline: 'Premium pool floats, towables, and water toys for resorts, hotels, and retailers.',
    ctaPrimary: { text: 'Shop Water Toys', href: '/catalog?category=pool' },
    ctaSecondary: { text: 'Sign in to order', href: '/login' },
    image: '/brands/aqua_leisure/aqua_leisure_hero_1.png',
    accentColor: '#00aeef',
  },
  {
    tag: 'Musical Instruments',
    headline: 'Where Every',
    accentWord: 'Note',
    subheadline: "Kid-friendly ukuleles, recorders, and percussion — music programs love them.",
    ctaPrimary: { text: 'Shop Instruments', href: '/catalog?category=music' },
    ctaSecondary: { text: 'Sign in to order', href: '/login' },
    image: '/brands/trophy_music/trophy_music_hero_3.png',
    accentColor: '#ffb600',
  },
  {
    tag: 'Outdoor Play',
    headline: 'Where Every',
    accentWord: 'Moment',
    subheadline: 'Splash pads, sprinklers, and outdoor water play that keep kids smiling all day.',
    ctaPrimary: { text: 'Shop Outdoor Play', href: '/catalog?category=outdoor' },
    ctaSecondary: { text: 'Sign in to order', href: '/login' },
    image: '/brands/boss_play/boss_play_hero_4.png',
    accentColor: '#8cc63f',
  },
  {
    tag: 'Puzzles & Games',
    headline: 'Where Every',
    accentWord: 'Discovery',
    subheadline: 'Jigsaw puzzles, board games, and family entertainment for every age group.',
    ctaPrimary: { text: 'Shop Puzzles', href: '/catalog' },
    ctaSecondary: { text: 'Sign in to order', href: '/login' },
    image: '/brands/masterpieces/masterpieces_hero_3.png',
    accentColor: '#ffb600',
  },
  {
    tag: 'Towables & Tubes',
    headline: 'Where Every',
    accentWord: 'Thrill',
    subheadline: 'From 1-rider rockets to 4-person party decks — wholesale pricing for your fleet.',
    ctaPrimary: { text: 'Browse Towables', href: '/catalog' },
    ctaSecondary: { text: 'Sign in to order', href: '/login' },
    image: '/brands/airhead/airhead_hero_1.png',
    accentColor: '#f15a24',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);
  const prev = () => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5500);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background — only load the active slide image (others are multi-MB PNGs) */}
      {SLIDES.map((slide, i) => (
        <div key={i} className={`hero-slide${i === current ? ' active' : ''}`}>
          {i === current && (
            <div
              className="hero-slide-bg"
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
          )}
        </div>
      ))}

      {/* Dark overlay gradient */}
      <div className="hero-overlay" />

      {/* Centered content — one block per slide */}
      <div className="hero-center">
        {SLIDES.map((slide, i) => (
          <div key={i} className={`hero-content${i === current ? ' active' : ''}`} data-index={i}>
            <div className="hero-tag animate-item">{slide.tag}</div>
            <h1 className="hero-headline animate-item">
              {slide.headline}{' '}
              <span className="hero-accent" style={{ color: slide.accentColor }}>
                {slide.accentWord}
              </span>
              {' '}Begins
            </h1>
            <p className="hero-sub animate-item">{slide.subheadline}</p>
            <div className="hero-ctas">
              <Link href={slide.ctaPrimary.href} className="btn-hero-primary">
                {slide.ctaPrimary.text}
              </Link>
              <Link href={slide.ctaSecondary.href} className="btn-hero-secondary">
                {slide.ctaSecondary.text}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Dots + prev/next */}
      <div className="hero-bottom">
        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
            >
              <span className="hero-dot-fill" />
            </button>
          ))}
        </div>
      </div>

      {/* Prev / Next — inline styles since the Vite CSS doesn't define these */}
      {[
        { label: 'Previous slide', side: 'left', onClick: prev, path: 'M15 19l-7-7 7-7' },
        { label: 'Next slide', side: 'right', onClick: next, path: 'M9 5l7 7-7 7' },
      ].map(({ label, side, onClick, path }) => (
        <button
          key={side}
          onClick={onClick}
          aria-label={label}
          style={{
            position: 'absolute',
            [side]: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 20,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
          </svg>
        </button>
      ))}
    </section>
  );
}
