'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { roundIvaPrice, formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: any;
}

const parseImageUrls = (urls: any): string[] => {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls;
  if (typeof urls === 'string') {
    try {
      return JSON.parse(urls);
    } catch (e) {
      console.error('Error parsing image_urls:', e);
      return [];
    }
  }
  return [];
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const images = parseImageUrls(product.image_urls || product.image_url);
  const mainImage = images[0] || `https://picsum.photos/400/400?random=${product.id}`;
  
  // RAW prices for comparison
  const currentPriceRaw = Number(product.price || 0);
  const originalPriceRaw = product.original_price ? Number(product.original_price) : null;
  const hasOffer = originalPriceRaw !== null && originalPriceRaw > currentPriceRaw;

  // Calculate price with IVA dynamically to ensure consistency with discounts
  const priceWithIva = roundIvaPrice(currentPriceRaw * 1.19);
  const originalPriceWithIva = originalPriceRaw ? roundIvaPrice(originalPriceRaw * 1.19) : null;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const message = encodeURIComponent(`Hola! Estoy interesado en el producto: ${product.name}`);
    window.open(`https://api.whatsapp.com/send?phone=573052200300&text=${message}`, '_blank');
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
      <Link href={`/producto/${product.id}`} className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center">
        {hasOffer && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10 animate-pulse">
            Oferta
          </span>
        )}
        {product.isBestSeller && (
          <span className={`absolute top-3 ${hasOffer ? 'left-[70px]' : 'left-3'} bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide z-10`}>
            Más Vendido
          </span>
        )}
        <Image 
          className="object-cover group-hover:scale-105 transition-transform duration-500" 
          src={mainImage} 
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      </Link>
      
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-1 flex justify-between items-start">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {product.brands?.name || 'Marca'}
          </p>
          <p className="text-[10px] text-slate-400">SKU: {product.sku || `M-${product.id}`}</p>
        </div>
        
        <Link href={`/producto/${product.id}`} className="font-display font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </Link>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-[11px] font-medium text-slate-600">
            {product.categories?.name || 'General'}
          </span>
        </div>
        
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {product.description}
        </p>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              {hasOffer && originalPriceWithIva && (
                <span className="text-xs text-slate-400 line-through font-medium block">
                  ${formatCurrency(originalPriceWithIva)}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xl text-primary block">
                  ${formatCurrency(priceWithIva)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">IVA incluido</span>
              </div>
            </div>
            <div className={`text-[10px] font-bold ${product.status === 'Activo' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-600'} px-2 py-1 rounded-full`}>
              En Stock
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => addToCart(product)}
              className="flex-1 px-3 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 group/cart"
            >
              <span className="material-symbols-outlined text-[18px] group-hover/cart:animate-bounce">add_shopping_cart</span>
              Añadir
            </button>
            <button 
              onClick={handleWhatsApp}
              className="px-3 py-2.5 rounded-lg border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300 flex items-center justify-center"
              title="Consultar por WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
