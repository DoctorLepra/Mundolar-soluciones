'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Footer: React.FC = () => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

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
              Proveedor líder de soluciones de telecomunicaciones profesionales. Conectamos empresas con tecnología de radio confiable.
            </p>
            <div className="flex gap-4 pt-2">
              <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
              <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
              <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined">photo_camera</span></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Tienda</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/catalogo" className="hover:text-white transition-colors">Radios Portátiles</Link></li>
              <li><Link href="/catalogo" className="hover:text-white transition-colors">Bases Móviles</Link></li>
              <li><Link href="/catalogo" className="hover:text-white transition-colors">Accesorios</Link></li>
              <li><Link href="/catalogo" className="hover:text-white transition-colors">Repuestos</Link></li>
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
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">location_on</span>
                <span>1234 Av. Telecom, Distrito Tecnológico,<br/>Ciudad, CP 56789</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">call</span>
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-lg">mail</span>
                <span>info@mundolarsoluciones.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2024 Mundolar Soluciones. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a className="hover:text-slate-300" href="#">Política de Privacidad</a>
            <a className="hover:text-slate-300" href="#">Términos de Servicio</a>
            <a className="hover:text-slate-300" href="#">Mapa del Sitio</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
