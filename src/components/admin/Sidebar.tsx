'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    fetchPendingCount();
    fetchUserProfile();

    // Request Notification Permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

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

  useEffect(() => {
    if (userProfile) {
      fetchNotifications();
      
      const notificationsChannel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            table: 'notifications', 
            schema: 'public',
            filter: `user_id=eq.${userProfile.id}`
          },
          (payload) => {
            setToast({
              title: payload.new.title,
              message: payload.new.message
            });
            
            // Dispatch Native System Notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification(payload.new.title, {
                body: payload.new.message,
                icon: '/favicon.ico', // Adjust icon path if needed
              });

              notification.onclick = () => {
                window.focus();
                // Determine target URL based on type
                let targetUrl = '#';
                switch (payload.new.type) {
                  case 'task': targetUrl = `/admin/clientes?taskId=${payload.new.related_id}`; break;
                  case 'quote': targetUrl = `/admin/cotizaciones?id=${payload.new.related_id}`; break;
                  case 'order': targetUrl = `/admin/pedidos?id=${payload.new.related_id}`; break;
                }
                if (targetUrl !== '#') window.location.href = targetUrl;
                notification.close();
              };
            }

            setTimeout(() => setToast(null), 5000);
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', table: 'notifications', schema: 'public', filter: `user_id=eq.${userProfile.id}` },
          () => fetchNotifications()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
      };
    }
  }, [userProfile]);

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

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Productos', path: '/admin/productos', icon: 'inventory_2' },
    { label: 'Bodegas', path: '/admin/bodegas', icon: 'warehouse' },
    { label: 'Categorías', path: '/admin/categorias', icon: 'category' },
    { label: 'Marcas', path: '/admin/marcas', icon: 'verified' },
    { label: 'Pedidos', path: '/admin/pedidos', icon: 'shopping_cart' },
    { label: 'Cotizaciones', path: '/admin/cotizaciones', icon: 'request_quote' },
    { label: 'CRM', path: '/admin/clientes', icon: 'group' },
  ];

  const contentItems = [
    { label: 'CMS Páginas', path: '/admin/cms', icon: 'article' },
  ];

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

  const getNotificationLink = (notif: Notification) => {
    switch (notif.type) {
      case 'task': return `/admin/clientes?taskId=${notif.related_id}`;
      case 'quote': return `/admin/cotizaciones?id=${notif.related_id}`;
      case 'order': return `/admin/pedidos?id=${notif.related_id}`;
      default: return '#';
    }
  };

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
        <Link 
          href="/admin/usuarios"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
            isActive('/admin/usuarios')
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className={`material-symbols-outlined text-[22px] ${isActive('/admin/usuarios') ? 'icon-fill' : ''}`}>group_add</span>
          <span className="text-sm font-medium font-display">Usuarios</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-200 relative">
        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <div className="absolute bottom-full left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-2xl mb-2 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Notificaciones</p>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-slate-200 text-3xl mb-1">notifications_off</span>
                  <p className="text-xs text-slate-400 font-display">No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map(notif => (
                    <Link 
                      key={notif.id}
                      href={getNotificationLink(notif)}
                      onClick={() => {
                        markAsRead(notif.id);
                        setIsNotificationsOpen(false);
                      }}
                      className={`p-3 block hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-primary/[0.02]' : ''}`}
                    >
                      <p className="text-xs font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
                        {!notif.is_read && <span className="size-1.5 bg-primary rounded-full"></span>}
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 transition-colors group">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative flex items-center justify-center rounded-full h-8 w-8 bg-slate-100 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer group/notif"
          >
            <span className="material-symbols-outlined text-[20px] group-hover/notif:scale-110 transition-transform">person</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black size-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
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
      </div>

      {/* Realtime Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className="bg-white border-l-4 border-l-primary shadow-2xl rounded-xl p-4 min-w-[300px] border border-slate-200 flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary">notifications_active</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900">{toast.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
