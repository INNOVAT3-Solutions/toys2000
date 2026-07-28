import { notFound } from 'next/navigation';
import BrandPage from '@/components/marketing/BrandPage';
import { brands } from '@/lib/marketing-data';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const brand = brands.find((b) => b.id === slug);
  if (!brand) return { title: 'Brand Not Found — Toys2000' };
  return { title: `${brand.name} — Toys2000` };
}

export default async function BrandRoutePage({ params }) {
  const { slug } = await params;
  const brand = brands.find((b) => b.id === slug);
  if (!brand) notFound();
  return <BrandPage brand={brand} />;
}
