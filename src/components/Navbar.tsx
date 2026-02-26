'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  if (isAdmin || isAuth) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="bg-primary text-white py-2 px-4 md:px-10 text-xs font-medium flex justify-between items-center">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">call</span> +57 305 2200300</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">mail</span> comercial@mundolarsoluciones.com</span>
        </div>
        <div className="hidden sm:flex gap-4">
          <a 
            href="https://api.whatsapp.com/send?phone=573052200300&text=Hola!%20Quisiera%20obtener%20m%C3%A1s%20informaci%C3%B3n." 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:underline opacity-90"
          >
            Soporte
          </a>
          <Link href="/admin" className="hover:underline opacity-90">Portal Admin</Link>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined">leak_add</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Mundolar</h2>
          </Link>
          <div className="hidden md:flex flex-1 max-w-xl px-8">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary transition-all active:border-none focus:outline-none" 
                placeholder="Buscar radios, repuestos o modelos..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/carrito" className="relative flex flex-col items-center gap-1 text-slate-600 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/admin" className="flex flex-col items-center gap-1 text-slate-600 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
            <button className="md:hidden p-2 text-slate-600">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
        <nav className="hidden md:flex gap-8 mt-4 pt-4 border-t border-slate-100 justify-center">
          <Link href="/" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/' ? 'text-primary' : 'text-slate-700'}`}>Inicio</Link>
          <Link href="/catalogo" className={`text-sm font-medium hover:text-primary transition-colors ${pathname?.startsWith('/catalogo') ? 'text-primary' : 'text-slate-700'}`}>Catalogo</Link>
          <Link href="/servicios" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/servicios' ? 'text-primary' : 'text-slate-700'}`}>Servicios</Link>
          <Link href="/nosotros" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/nosotros' ? 'text-primary' : 'text-slate-700'}`}>Nosotros</Link>
          <Link href="/contacto" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/contacto' ? 'text-primary' : 'text-slate-700'}`}>Contacto</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
