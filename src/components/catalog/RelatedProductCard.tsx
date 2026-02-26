'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

interface Props {
  product: any;
}

const parseImageUrls = (urls: any): string[] => {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls;
  if (typeof urls === 'string') {
    try {
      const parsed = JSON.parse(urls);
      return Array.isArray(parsed) ? parsed : [urls];
    } catch {
      return [urls];
    }
  }
  return [];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'decimal' }).format(value);

const roundIvaPrice = (price: number) => {
  const rounded = Math.round(price);
  const rem = rounded % 1000;
  if (rem === 0) return rounded;
  if (rem <= 500) return Math.floor(rounded / 1000) * 1000 + 500;
  return Math.ceil(rounded / 1000) * 1000;
};

export default function RelatedProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const images = parseImageUrls(product.image_urls);
  const mainImage = images[0] || null;
  const priceWithIva = product.price_with_iva || roundIvaPrice(Number(product.price) * 1.19);
  const originalPriceWithIva = product.original_price ? roundIvaPrice(Number(product.original_price) * 1.19) : null;

  return (
    <div className="flex flex-col rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden h-full">
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
        {originalPriceWithIva && originalPriceWithIva > priceWithIva && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide z-10 animate-pulse">Oferta</span>
        )}
        <Link href={`/producto/${product.id}`} className="absolute inset-0 z-0">
          {mainImage ? (
            <Image 
              src={mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <span className="material-symbols-outlined text-4xl">image</span>
            </div>
          )}
        </Link>
      </div>
      
      <div className="p-4 flex flex-col flex-1 gap-2 bg-white border-t border-slate-50">
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {product.brands?.name || 'Marca'}
          </p>
          <Link href={`/producto/${product.id}`}>
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
          </Link>
          <p className="text-sm text-slate-500 line-clamp-2 mt-1">{product.description}</p>
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div>
            {originalPriceWithIva && originalPriceWithIva > priceWithIva && (
              <p className="text-slate-400 text-[10px] line-through">
                ${formatCurrency(originalPriceWithIva)}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <p className="text-xl font-bold text-primary leading-none">
                ${formatCurrency(priceWithIva)}
              </p>
              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">IVA incluido</span>
            </div>
          </div>
          <button 
            onClick={() => addToCart(product)}
            className="flex items-center justify-center size-9 rounded-full bg-slate-100 text-slate-900 hover:bg-primary hover:text-white transition-colors cursor-pointer group/btn shadow-sm" 
            title="Añadir al carrito"
          >
            <span className="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
