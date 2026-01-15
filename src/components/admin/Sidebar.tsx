'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();

    // Subscribe to realtime changes in orders table
    const channel = supabase
      .channel('orders-count')
      .on(
        'postgres_changes',
        { event: '*', table: 'orders', schema: 'public' },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendiente');

      if (!error) {
        setPendingCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending orders count:', error);
    }
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Productos', path: '/admin/productos', icon: 'inventory_2' },
    { label: 'Categorías', path: '/admin/categorias', icon: 'category' },
    { label: 'Pedidos', path: '/admin/pedidos', icon: 'shopping_cart' },
    { label: 'Clientes', path: '/admin/clientes', icon: 'group' },
  ];

  const contentItems = [
    { label: 'CMS Páginas', path: '/admin/cms', icon: 'article' },
    { label: 'Archivos', path: '/admin/cms', icon: 'folder_open' },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-20 min-h-screen">
      <div className="p-6 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl font-bold">router</span>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">Mundolar Admin</h1>
        </Link>
        <p className="text-slate-500 text-xs mt-1">Telecomunicaciones</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display px-3 pb-2 pt-2">Menú Principal</p>
        {menuItems.map((item) => (
          <Link
            key={`menu-${item.path}-${item.label}`}
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
            <span className="text-sm font-medium font-display">{item.label}</span>
            {item.label === 'Pedidos' && pendingCount > 0 && (
               <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm shadow-primary/30">
                 {pendingCount}
               </span>
            )}
          </Link>
        ))}
        
        <div className="pt-4 pb-2 px-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Contenido</p>
        </div>
        {contentItems.map((item) => (
          <Link
            key={`content-${item.path}-${item.label}`}
            href={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
            <span className="text-sm font-medium font-display">{item.label}</span>
          </Link>
        ))}

        <div className="pt-4 pb-2 px-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Sistema</p>
        </div>
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors group">
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-sm font-medium font-display">Configuración</span>
        </button>
      </nav>
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer">
          <div className="bg-center bg-no-repeat bg-cover rounded-full h-8 w-8 bg-slate-200" style={{backgroundImage: 'url("https://picsum.photos/32/32")'}}></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate font-display">Roberto G.</p>
            <p className="text-xs text-slate-500 truncate">Admin Principal</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[18px]">logout</span>
        </div>
      </div>
    </aside>
  );
}
