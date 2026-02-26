
import React from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import ProductActions from '@/components/catalog/ProductActions';
import ProductImageGallery from '@/components/catalog/ProductImageGallery';
import ProductTabs from '@/components/catalog/ProductTabs';
import ProductCard from '@/components/catalog/ProductCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseImageUrls = (urls: any): string[] => {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls;
  if (typeof urls === 'string') {
    try { return JSON.parse(urls); } catch { return [urls]; }
  }
  return [];
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(value));

const withIva = (price: number) => {
  const raw = price * 1.19;
  const rounded = Math.round(raw);
  const rem = rounded % 1000;
  if (rem === 0) return rounded;
  if (rem <= 500) return Math.floor(rounded / 1000) * 1000 + 500;
  return Math.ceil(rounded / 1000) * 1000;
};

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(name), categories(name)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as any;
}

async function getRelatedProducts(currentId: number, categoryId: number | null) {
  // First try products from the same category
  if (categoryId) {
    const { data: categoryProducts } = await supabase
      .from('products')
      .select('id, name, price, price_with_iva, original_price, image_urls, brands(name), categories(name)')
      .eq('status', 'Activo')
      .eq('category_id', categoryId)
      .neq('id', currentId)
      .limit(4);

    if (categoryProducts && categoryProducts.length >= 4) {
      return categoryProducts;
    }
  }

  // Fallback: any active products (excluding current)
  const { data: fallbackProducts } = await supabase
    .from('products')
    .select('id, name, price, price_with_iva, original_price, image_urls, brands(name), categories(name)')
    .eq('status', 'Activo')
    .neq('id', currentId)
    .limit(4);

  return fallbackProducts || [];
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Producto no encontrado' };

  const images = parseImageUrls(product.image_urls);
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${product.name} | Mundolar Soluciones`,
    description: product.description || `Comprar ${product.name} al mejor precio.`,
    openGraph: {
      images: [images[0] || '/images/default-product.jpg', ...previousImages],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const images = parseImageUrls(product.image_urls);
  const mainImage = images[0] || null;

  const priceWithIva = product.price_with_iva || withIva(Number(product.price));
  const originalWithIva = product.original_price ? withIva(Number(product.original_price)) : null;

  const relatedProducts = await getRelatedProducts(product.id, product.category_id);
  const technicalSpecs: string | null = product.specs || null;

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
        <Link className="hover:text-primary transition-colors" href="/">Inicio</Link>
        <span className="material-symbols-outlined text-base mx-2 text-slate-400">chevron_right</span>
        <Link className="hover:text-primary transition-colors" href="/catalogo">Catálogo</Link>
        <span className="material-symbols-outlined text-base mx-2 text-slate-400">chevron_right</span>
        <span className="font-medium text-slate-900 line-clamp-1">{product.name}</span>
      </nav>

      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* ── Left: image gallery ── */}
        <div className="lg:col-span-7">
          <ProductImageGallery
            images={images}
            productName={product.name}
            isOffer={!!(originalWithIva && originalWithIva > priceWithIva)}
          />
        </div>

        {/* ── Right: info panel ── */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Brand & status */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary font-bold text-sm uppercase tracking-wider">
              {product.brands?.name || 'Marca'}
            </span>
            <span className="text-sm text-green-600 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-base">check_circle</span> En Stock
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4 leading-tight">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-4 mb-6 pb-6 border-b border-slate-200">
            <span className="text-4xl font-display font-bold text-slate-900">
              ${formatCOP(priceWithIva)}
            </span>
            {originalWithIva && originalWithIva > priceWithIva && (
              <span className="text-lg text-slate-400 line-through font-medium">
                ${formatCOP(originalWithIva)}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide self-end mb-1">IVA incl.</span>
          </div>

          {/* Description summary — 3 lines max */}
          {product.description && (
            <div className="mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-slate-700 text-base leading-relaxed line-clamp-3">
                {product.description}
              </p>
            </div>
          )}

          {/* Action buttons – client component */}
          <ProductActions product={product} />

          {/* Shipping info */}
          <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-full text-primary shrink-0 shadow-sm border border-slate-100">
                <span className="material-symbols-outlined text-xl">local_shipping</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Envío a todo el país</h4>
                <p className="text-xs text-slate-500 mt-0.5">Despachos vía Starken, Chilexpress o Bluexpress.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs: Specs + Description Detallada + Warranty card ── */}
      <div className="mt-16 lg:mt-24">
        <ProductTabs
          specs={technicalSpecs}
          description={product.description || null}
          brandName={product.brands?.name || 'del Fabricante'}
        />
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 lg:mt-24 pt-12 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-bold text-slate-900">Productos Relacionados</h2>
            <Link className="text-primary text-sm font-bold hover:underline flex items-center gap-1" href="/catalogo">
              Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
