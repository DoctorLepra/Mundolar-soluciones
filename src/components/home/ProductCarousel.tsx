'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { roundIvaPrice, formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  price_with_iva: number | null;
  description: string | null;
  image_urls: any; // Can be string (JSON) or array
  brands: { name: string } | { name: string }[] | null;
  isBestSeller?: boolean;
}

interface ProductCarouselProps {
  products: Product[];
}

const parseImageUrls = (urls: any): string[] => {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls;
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls);
      return Array.isArray(parsed) ? parsed : [urls];
    } catch (e) {
      // If it starts with http, it's a single URL string
      if (urls.startsWith('http')) return [urls];
      return [];
    }
  }
  return [];
};


import ProductCard from '@/components/catalog/ProductCard';

const ProductCarousel: React.FC<ProductCarouselProps> = ({ products }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = current.clientWidth;
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (!products || products.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-slate-200 rounded-xl">
        <p className="text-slate-500">No hay productos destacados en este momento.</p>
      </div>
    );
  }

  return (
    <section className="max-w-[1440px] mx-auto px-4 md:px-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Novedades y Destacados</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            aria-label="Anterior"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            aria-label="Siguiente"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-6 pb-8 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {products.map((product) => (
          <div key={product.id} className="snap-start min-w-[280px] md:min-w-[320px] max-w-[320px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductCarousel;
