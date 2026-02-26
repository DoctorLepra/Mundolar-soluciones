'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
}

const Footer: React.FC = () => {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('status', 'Activo')
        .is('parent_id', null)
        .order('position', { ascending: true });
      
      if (data) setCategories(data);
    }
    fetchCategories();
  }, []);

  if (isAdmin || isAuth) return null;

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="size-8 bg-primary rounded-md flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">leak_add</span>
              </div>
              <h3 className="text-lg font-bold">Mundolar Soluciones</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Estando comprometidos al 100% en el crecimiento y desarrollo de nuestros clientes aliados, mejorando la productividad y mejor su conectividad con el mundo.
            </p>
            <div className="flex gap-4 pt-2">
              <a 
                href="https://web.facebook.com/mundolarsoluciones?_rdc=1&_rdr#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center justify-center size-8 bg-slate-800 rounded-lg"
              >
                <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a 
                href="https://www.instagram.com/mundolarsoluciones/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center justify-center size-8 bg-slate-800 rounded-lg"
              >
                <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.267-.07-1.646-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a 
                href="https://www.linkedin.com/company/mundolarsoluciones/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center justify-center size-8 bg-slate-800 rounded-lg"
              >
                <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a 
                href="https://api.whatsapp.com/send?phone=573052200300&text=Hola!%20Quisiera%20obtener%20m%C3%A1s%20informaci%C3%B3n." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors flex items-center justify-center size-8 bg-slate-800 rounded-lg"
              >
                <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Tienda</h4>
            <ul className="space-y-2 text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href="/catalogo" className="hover:text-white transition-colors">{cat.name}</Link>
                </li>
              ))}
              {categories.length === 0 && (
                <>
                  <li><Link href="/catalogo" className="hover:text-white transition-colors">Radios Portátiles</Link></li>
                  <li><Link href="/catalogo" className="hover:text-white transition-colors">Bases Móviles</Link></li>
                  <li><Link href="/catalogo" className="hover:text-white transition-colors">Accesorios</Link></li>
                  <li><Link href="/catalogo" className="hover:text-white transition-colors">Repuestos</Link></li>
                </>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Compañía</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/nosotros" className="hover:text-white transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/servicios" className="hover:text-white transition-colors">Soporte Técnico</Link></li>
              <li><Link href="/contacto" className="hover:text-white transition-colors">Contáctanos</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                <span>Carrera 7 #156 - 68 Ed. North Point III<br/>Bogotá D.C.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">call</span>
                <span>+57 305 2200300</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">mail</span>
                <span>comercial@mundolarsoluciones.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Mundolar Soluciones. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
