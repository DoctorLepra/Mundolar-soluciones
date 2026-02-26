'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Props {
  images: string[];
  productName: string;
  isOffer: boolean;
}

export default function ProductImageGallery({ images, productName, isOffer }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    setUserInteracted(true);
  }, []);

  // Auto-advance every 3 seconds if user hasn't interacted
  useEffect(() => {
    if (images.length <= 1) return;
    if (userInteracted) return;

    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [images.length, userInteracted]);

  const mainImage = images[activeIndex] || null;

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="bg-white rounded-2xl border border-slate-200 relative overflow-hidden aspect-[4/3]">
        {isOffer && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider z-10">
            Oferta
          </span>
        )}
        {mainImage ? (
          <Image
            key={mainImage}
            className="object-cover transition-opacity duration-500"
            src={mainImage}
            alt={productName}
            fill
            sizes="(max-width: 1024px) 100vw, 800px"
            priority
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
            <span className="material-symbols-outlined text-6xl">image_not_supported</span>
            <p className="text-sm font-medium">Sin imagen disponible</p>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-200 ${
                i === activeIndex
                  ? 'ring-2 ring-primary ring-offset-2 shadow-md shadow-primary/20'
                  : 'ring-1 ring-slate-200 opacity-60 hover:opacity-100 hover:ring-primary/50'
              }`}
            >
              <Image
                src={img}
                alt={`${productName} ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-slate-300 hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
