'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchPendingCount();
    fetchUserProfile();

    // Subscribe to realtime changes in orders table
    const ordersChannel = supabase
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
      supabase.removeChannel(ordersChannel);
    };
  }, []);



  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', user.id)
          .single();
        
        if (data) setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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



  const isAdmin = userProfile?.role === 'Admin';
  const isAuxiliar = userProfile?.role === 'Auxiliar de Gestión y Operaciones';

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Productos', path: '/admin/productos', icon: 'inventory_2' },
    ...(isAdmin || isAuxiliar ? [
      { label: 'Bodegas', path: '/admin/bodegas', icon: 'warehouse' },
      { label: 'Categorías', path: '/admin/categorias', icon: 'category' },
      { label: 'Marcas', path: '/admin/marcas', icon: 'verified' },
    ] : []),
    ...(!isAuxiliar ? [
      { label: 'Pedidos', path: '/admin/pedidos', icon: 'shopping_cart' },
      { label: 'Cotizaciones', path: '/admin/cotizaciones', icon: 'request_quote' },
      { label: 'CRM', path: '/admin/clientes', icon: 'group' },
    ] : [])
  ];

  const contentItems = isAdmin ? [
    { label: 'CMS Páginas', path: '/admin/cms', icon: 'article' },
  ] : [];

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };



  return (
    <aside className="w-screen lg:w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 z-[200] min-h-screen overflow-y-auto">
      
      {/* Mobile Header with close button */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100 lg:p-6">
        <Link href="/" onClick={onClose} className="flex items-center">
          <Image src="/img/logo-rojo-negro.png" alt="Mundolar Admin" width={200} height={50} className="h-10 lg:h-[62px] w-auto object-contain" />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center size-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* User profile banner - mobile only */}
      <div className="lg:hidden px-5 py-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 truncate font-display">
              {userProfile ? userProfile.full_name : '...'}
            </p>
            <p className="text-xs text-slate-500">{userProfile?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display px-3 pb-2 pt-2">Menú Principal</p>
        {menuItems.map((item) => (
          <Link
            key={`menu-${item.path}-${item.label}`}
            href={item.path}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl lg:rounded-lg transition-colors group ${
              isActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
            <span className="text-sm font-medium font-display">{item.label}</span>
            {item.label === 'Pedidos' && pendingCount > 0 && (
               <span className="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm shadow-primary/30">
                 {pendingCount}
               </span>
             )}
            {isActive(item.path) && (
              <span className="ml-auto material-symbols-outlined text-[18px] text-primary opacity-60">chevron_right</span>
            )}
          </Link>
        ))}
        
        {contentItems.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Contenido</p>
            </div>
            {contentItems.map((item) => (
              <Link
                key={`content-${item.path}-${item.label}`}
                href={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl lg:rounded-lg transition-colors group ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'icon-fill' : ''}`}>{item.icon}</span>
                <span className="text-sm font-medium font-display">{item.label}</span>
              </Link>
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">Sistema</p>
            </div>
            <Link 
              href="/admin/usuarios"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-xl lg:rounded-lg transition-colors group ${
                isActive('/admin/usuarios')
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${isActive('/admin/usuarios') ? 'icon-fill' : ''}`}>group_add</span>
              <span className="text-sm font-medium font-display">Usuarios</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 relative">


        {/* Desktop user footer */}
        <div className="hidden lg:flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition-colors group">
          <div className="size-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
             <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 truncate font-display">
              {userProfile ? userProfile.full_name : 'Cargando...'}
            </p>
            <button 
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Cerrar Sesión
              <span className="material-symbols-outlined text-[14px]">logout</span>
            </button>
          </div>
        </div>

        {/* Mobile logout button */}
        <button 
          onClick={handleLogout}
          className="lg:hidden w-full flex items-center gap-3 p-3 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors font-medium text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Cerrar Sesión
        </button>
      </div>


    </aside>
  );
}


