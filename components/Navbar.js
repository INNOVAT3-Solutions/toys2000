'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Full-bleed hero under the transparent navbar
const HERO_PATHS = ['/', '/brands'];

export default function Navbar({ cartCount = 0, onCartOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const isHeroPage = HERO_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  const orderNowHref = user ? '/catalog' : '/login?redirect=/catalog';

  useEffect(() => {
    if (isHeroPage) {
      document.body.classList.add('has-hero-nav');
    } else {
      document.body.classList.remove('has-hero-nav');
    }
    return () => document.body.classList.remove('has-hero-nav');
  }, [isHeroPage]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success('Signed out');
    router.push('/');
    router.refresh();
  };

  const profileInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?';
  const isProfilePage = pathname === '/profile' || pathname.startsWith('/profile/');

  const scrollToId = (id) => (e) => {
    if (pathname !== '/') return;
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <>
      <nav className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        <div className="nav-row">

          <div className="nav-group nav-group-left">
            <div className="nav-links">
              <Link href="/#catalogs" className="nav-link" onClick={scrollToId('catalogs')}>
                Catalogs
              </Link>
              <Link href="/catalog" className="nav-link">Shop All</Link>
              <Link href="/catalog/brands" className="nav-link">Brands</Link>
              <Link href="/#featured" className="nav-link" onClick={scrollToId('featured')}>
                Promos
              </Link>
              {user && (
                <Link href="/orders" className="nav-link">My Orders</Link>
              )}
            </div>
          </div>

          <div className="nav-center">
            <Link href="/" className="nav-master-logo" aria-label="Toys2000 home">
              <Image
                src="/logos/toys_2000_logo.png"
                alt="Toys2000"
                width={180}
                height={150}
                className="nav-master-logo-img"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </Link>
          </div>

          <div className="nav-group nav-group-right">
            {user ? (
              <>
                <Link href={orderNowHref} className="nav-quote-btn">
                  Order Now
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                <button
                  onClick={onCartOpen}
                  className="nav-cart-btn"
                  aria-label="Open cart"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className={`cart-badge${cartCount === 0 ? ' hidden' : ''}`}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                </button>

                <Link
                  href="/profile"
                  className={`nav-profile-btn${isProfilePage ? ' nav-profile-btn-active' : ''}`}
                  aria-label="My profile"
                  title="My profile"
                >
                  <span className="nav-profile-initials">{profileInitials}</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="nav-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Sign In
                </Link>
                <Link href={orderNowHref} className="nav-quote-btn">
                  Order Now
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}

            <button
              className="nav-cart-btn"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              style={{ display: 'var(--show-mobile-menu, none)' }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            style={{
              borderTop: '1px solid var(--glass-border)',
              background: 'white',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Link href="/#catalogs" className="nav-link" style={{ padding: '8px 0' }} onClick={scrollToId('catalogs')}>
              Catalogs
            </Link>
            <Link href="/catalog" className="nav-link" style={{ padding: '8px 0' }}>Shop All</Link>
            <Link href="/catalog/brands" className="nav-link" style={{ padding: '8px 0' }}>Brands</Link>
            <Link href="/#featured" className="nav-link" style={{ padding: '8px 0' }} onClick={scrollToId('featured')}>
              Promos
            </Link>
            {user && (
              <>
                <Link href="/orders" className="nav-link" style={{ padding: '8px 0' }}>My Orders</Link>
                <Link href="/profile" className="nav-link" style={{ padding: '8px 0' }}>Profile</Link>
              </>
            )}
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!user && (
                <Link href="/login" className="nav-link" style={{ padding: '8px 0' }}>
                  Sign In
                </Link>
              )}
              <Link href={orderNowHref} className="nav-quote-btn" style={{ width: '100%', justifyContent: 'center' }}>
                Order Now
              </Link>
              {user && (
                <button onClick={handleSignOut} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}>
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {!isHeroPage && <div style={{ height: '96px' }} />}
    </>
  );
}
