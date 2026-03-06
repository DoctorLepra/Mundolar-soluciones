'use client';

import React from 'react';
import Link from 'next/link';

export default function ServicesHeroActions() {
  const scrollToServices = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('servicios-grid');
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 80; // Adjusted for header
      window.scrollTo({
        top,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mt-10 flex flex-wrap justify-center gap-4">
      <Link 
        href="/contacto" 
        className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-bold text-white transition-all hover:bg-primary/90 hover:scale-105 shadow-lg"
      >
        Solicitar Cotización
      </Link>
      <a 
        href="#servicios-grid" 
        onClick={scrollToServices}
        className="inline-flex items-center justify-center rounded-lg bg-white/10 px-8 py-3 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 cursor-pointer"
      >
        Ver Servicios
      </a>
    </div>
  );
}
