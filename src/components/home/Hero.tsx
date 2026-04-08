'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface HeroProps {
  data?: {
    badge: string;
    title: string;
    description: string;
    images: string[];
  };
}

const Hero: React.FC<HeroProps> = ({ data }) => {
  const defaultImages = [
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1451187534959-5256721597a7?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1920&auto=format&fit=crop'
  ];
  
  const heroImages = data?.images && data.images.length > 0 ? data.images : defaultImages;
  const [currentSlide, setCurrentSlide] = useState(0);

  const fullText = data?.description || "Descubra lo último en tecnología de radio digital móvil. Desde unidades portátiles robustas hasta estaciones base de alta potencia, mantenemos a su equipo conectado en cualquier lugar.";

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev === heroImages.length - 1 ? 0 : prev + 1));
    }, 7000);
    return () => clearInterval(slideInterval);
  }, [heroImages.length]);

  return (
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center text-white overflow-hidden -mt-6 md:-mt-10">
        <div className="absolute inset-0 z-0">
          {heroImages.map((src, index) => (
            <Image
              key={index}
              src={src}
              alt={`Hero background ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 100vw"
              quality={75}
              className={`object-cover transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
              priority={index === 0}
            />
          ))}
          <div className="absolute inset-0 bg-slate-900/60"></div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Ir a diapositiva ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white'
              }`}
            ></button>
          ))}
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 md:px-10">
          <div className="flex flex-col gap-6 items-start max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
              {data?.badge || 'Nueva Serie Disponible'}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white text-left">
              {data?.title ? (
                <span>{data.title}</span>
              ) : (
                <>Comunicación <br /><span className="text-primary">Sin Límites</span></>
              )}
            </h1>
            <p className="text-lg text-slate-200 max-w-lg leading-relaxed text-left min-h-[112px] md:min-h-[84px] animate-fade-in-up">
              {fullText}
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <Link href="/catalogo" className="flex items-center justify-center h-12 px-4 md:px-8 bg-primary hover:bg-primary-dark text-white text-sm md:text-base font-bold rounded-lg transition-all shadow-lg shadow-primary/25 whitespace-nowrap">
                Comprar Ahora
              </Link>
              <Link href="/catalogo" className="flex items-center justify-center h-12 px-4 md:px-8 bg-white/10 border border-white/20 hover:bg-white/20 text-white text-sm md:text-base font-bold rounded-lg transition-all backdrop-blur-sm whitespace-nowrap">
                Ver Catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>
  );
}

export default Hero;
