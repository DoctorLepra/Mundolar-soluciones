
import React from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  status: string;
  image_url: string | null;
  brands: { name: string } | null;
  // Add other fields if available in DB, otherwise we assume defaults for now
}

interface Props {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands (name)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }
  return data as Product;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'Producto no encontrado',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${product.name} | Mundolar Soluciones`,
    description: product.description || `Comprar ${product.name} al mejor precio.`,
    openGraph: {
      images: [product.image_url || '/images/default-product.jpg', ...previousImages],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  // Placeholder logic for related products since we don't have a complex recommendation system yet
  const relatedProducts = [
    { id: 101, name: 'Radio ProTalk PKT-23', brand: 'Kenwood', price: 135.00, img: 'https://picsum.photos/400/400?random=2' },
    { id: 102, name: 'Batería Alta Capacidad', brand: 'Accesorios', price: 45.00, img: 'https://picsum.photos/400/400?random=4' },
    { id: 103, name: 'Audífono Mag One', brand: 'Audio', price: 35.00, img: 'https://picsum.photos/400/400?random=6', outOfStock: true },
    { id: 104, name: 'Radio Talkabout T400', brand: 'Motorola', price: 89.00, img: 'https://picsum.photos/400/400?random=5' }
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8">
      <nav className="flex items-center text-sm text-slate-500 mb-8 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
        <Link className="hover:text-primary transition-colors" href="/">Inicio</Link>
        <span className="material-symbols-outlined text-base mx-2 text-slate-400">chevron_right</span>
        <Link className="hover:text-primary transition-colors" href="/catalogo">Catálogo</Link>
        <span className="material-symbols-outlined text-base mx-2 text-slate-400">chevron_right</span>
        <span className="font-medium text-slate-900 line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center aspect-[4/3] relative overflow-hidden group">
            {product.original_price && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider z-10">Oferta</span>
            )}
            <div className="relative w-full h-full">
                <Image 
                    className="object-contain group-hover:scale-105 transition-transform duration-500" 
                    src={product.image_url || `https://picsum.photos/800/600?random=${product.id}`} 
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 800px"
                    priority
                />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <div className="mb-2">
            <span className="text-primary font-bold text-sm uppercase tracking-wider">{product.brands?.name || 'Marca'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4 leading-tight">{product.name}</h1>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex text-yellow-400 text-xl">
              {[1, 2, 3, 4, 5].map(s => <span key={s} className="material-symbols-outlined icon-fill">star</span>)}
            </div>
            <span className="text-sm text-slate-500 font-medium">(Sin Reseñas)</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-green-600 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-base">check_circle</span> En Stock
            </span>
          </div>
          <div className="flex items-baseline gap-4 mb-6 pb-6 border-b border-slate-200">
            <span className="text-4xl font-display font-bold text-slate-900">${Number(product.price).toFixed(2)}</span>
            {product.original_price && (
                <span className="text-lg text-slate-400 line-through font-medium">${Number(product.original_price).toFixed(2)}</span>
            )}
          </div>
          <p className="text-slate-600 text-base leading-relaxed mb-8">
            {product.description || 'Sin descripción disponible para este producto.'}
          </p>
          
          <div className="space-y-4 mb-8">
             {/* Client Component for Quantity/Cart could go here. For now, simple static buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer">
                <span className="material-symbols-outlined">shopping_cart</span> Añadir al Carrito
              </button>
            </div>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-[24px]">chat</span> Comprar por WhatsApp
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 space-y-4 border border-slate-200">
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
      
      <div className="mt-16 lg:mt-24">
        <div className="border-b border-slate-200 mb-8">
            <nav className="flex gap-8 overflow-x-auto no-scrollbar pb-1">
                <button className="pb-4 border-b-2 border-primary text-primary font-bold text-sm uppercase tracking-wide whitespace-nowrap transition-colors">Descripción</button>
            </nav>
        </div>
        <div>
             <p className="text-slate-700 leading-relaxed max-w-4xl">{product.description || 'No hay información adicional.'}</p>
        </div>
      </div>

      <div className="mt-16 lg:mt-24 pt-12 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold text-slate-900">Productos Relacionados</h2>
              <Link className="text-primary text-sm font-bold hover:underline flex items-center gap-1" href="/catalogo">Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((prod: any) => (
                  <div key={prod.id} className={`group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all ${prod.outOfStock ? 'opacity-75' : ''}`}>
                      <div className="relative aspect-square p-6 flex items-center justify-center bg-white">
                          <div className="relative w-full h-full"> 
                            <Image 
                                alt={prod.name} 
                                className="object-contain group-hover:scale-105 transition-transform" 
                                src={prod.img}
                                fill
                                sizes="(max-width: 768px) 100vw, 250px"
                            />
                          </div>
                          {prod.outOfStock && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase z-20">Agotado</span></div>}
                      </div>
                      <div className="p-4">
                          <p className="text-xs text-slate-400 mb-1">{prod.brand}</p>
                          <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2">{prod.name}</h3>
                          <span className={`font-bold ${prod.outOfStock ? 'text-slate-400' : 'text-primary'}`}>${Number(prod.price).toFixed(2)}</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </main>
  );
}
