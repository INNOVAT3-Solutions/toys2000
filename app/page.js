import Link from 'next/link';
import Image from 'next/image';
import HeroCarousel from '@/components/HeroCarousel';
import { HOME_CATEGORIES } from '@/lib/home-categories';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getBrowseAccess, getCatalogDb } from '@/lib/browse-access';
import { getActiveManufacturers, resolveBrandLogo } from '@/lib/active-manufacturers';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);
  const brands = await getActiveManufacturers(db);

  return (
    <div className="min-h-screen">
      <HeroCarousel />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold text-[#f15a24] uppercase tracking-widest mb-1">Browse</p>
            <h2 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Shop by Category
            </h2>
          </div>
          <Link href="/catalog" className="text-sm font-semibold text-[#00aeef] hover:underline">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {HOME_CATEGORIES.map((cat, index) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.id}`}
              className="relative rounded-2xl overflow-hidden group aspect-[4/3]"
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, 25vw"
                loading={index < 4 ? 'eager' : 'lazy'}
                priority={index < 2}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
                  {cat.name}
                </p>
                <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-4 sm:mx-6 lg:mx-auto max-w-7xl mb-16">
        <div
          className="rounded-2xl px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6"
          style={{ background: 'linear-gradient(135deg, #f15a24 0%, #ff7a4d 50%, #00aeef 100%)' }}
        >
          <div className="text-white text-center sm:text-left">
            <h3 className="text-2xl font-bold" style={{ fontFamily: "'Baloo 2', cursive" }}>
              Ready to place your first order?
            </h3>
            <p className="text-white/90 mt-1 text-sm">
              Browse thousands of products with Net 30 terms. No credit card required.
            </p>
          </div>
          <Link
            href="/catalog"
            className="flex-shrink-0 bg-white font-bold px-6 py-3 rounded-xl text-sm transition-all hover:shadow-lg"
            style={{ color: '#f15a24', fontFamily: "'Baloo 2', cursive" }}
          >
            Browse Catalog →
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-[#f15a24] uppercase tracking-widest mb-1">Represented by Toys2000</p>
          <h2 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
            Our Brands
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {brands.map((brand) => {
            const logo = brand.logo_url || resolveBrandLogo(brand.name);
            return (
              <Link
                key={brand.manufacturer_id}
                href={`/catalog/${brand.manufacturer_id}`}
                className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center justify-center h-24 hover:shadow-md transition-all group"
              >
                {logo ? (
                  <Image
                    src={logo}
                    alt={brand.name}
                    width={120}
                    height={60}
                    className="object-contain max-h-12 w-auto group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <span className="text-sm font-bold text-[#1a1d26] text-center px-2">{brand.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-[#f7f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/logos/toys_2000_logo.png" alt="Toys2000" width={120} height={40} className="h-9 w-auto object-contain opacity-80" />
          <p className="text-xs text-[#5f6980]">© {new Date().getFullYear()} Toys2000. Wholesale portal for approved retailers only.</p>
          <div className="flex gap-4 text-xs font-semibold text-[#5f6980]">
            <Link href="/catalog" className="hover:text-[#f15a24]">Catalog</Link>
            <Link href="/orders" className="hover:text-[#f15a24]">My Orders</Link>
            <Link href="/terms" className="hover:text-[#f15a24]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#f15a24]">Privacy</Link>
            <Link href="/login" className="hover:text-[#f15a24]">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
