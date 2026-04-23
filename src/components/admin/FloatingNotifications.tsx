'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Bell, X, Info, ExternalLink, MessageSquare, ShoppingCart, FileText } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export default function FloatingNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Initial Fetch
    fetchNotifications(user.id);

    // Realtime Subscription
    const channel = supabase
      .channel('floating-notifications')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          table: 'notifications', 
          schema: 'public',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications(user.id);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          table: 'notifications', 
          schema: 'public',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setToast({
            title: payload.new.title,
            message: payload.new.message
          });
          setTimeout(() => setToast(null), 5000);
          
          // Native notification
          if (Notification.permission === 'granted') {
             new Notification(payload.new.title, { body: payload.new.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart size={18} className="text-blue-500" />;
      case 'quote': return <FileText size={18} className="text-amber-500" />;
      case 'task': return <MessageSquare size={18} className="text-emerald-500" />;
      default: return <Info size={18} className="text-slate-400" />;
    }
  };

  const getLink = (notif: Notification) => {
    switch (notif.type) {
      case 'task': return `/admin/clientes?taskId=${notif.related_id}`;
      case 'quote': return `/admin/cotizaciones?id=${notif.related_id}`;
      case 'order': return `/admin/pedidos?id=${notif.related_id}`;
      default: return '#';
    }
  };

  return (
    <>
      {/* Inline Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative size-10 bg-white text-slate-600 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-primary transition-colors ml-auto shrink-0"
      >
        <Bell size={20} className="transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Overlay Modal */}
      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex justify-end lg:justify-center lg:items-center animate-in fade-in duration-300">
          
          <div className="bg-white w-full h-full lg:h-auto lg:max-h-[85vh] lg:max-w-2xl lg:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right lg:slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between p-6 lg:p-8 border-b border-slate-100 bg-white z-10 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-display">Notificaciones</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-slate-500 text-sm">Tienes {unreadCount} mensajes sin leer</p>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-md"
                    >
                      Marcar todo leído
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="size-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors hover:text-red-500 hover:bg-red-50"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 p-6 lg:p-8 bg-slate-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                <Bell size={64} className="mb-4 opacity-20" />
                <p className="font-medium">No hay notificaciones aún</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={getLink(notif)}
                  onClick={() => {
                    markAsRead(notif.id);
                    setIsOpen(false);
                  }}
                  className={`block p-4 rounded-2xl border transition-all ${
                    !notif.is_read 
                      ? 'bg-primary/5 border-primary/20 shadow-sm' 
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      !notif.is_read ? 'bg-white' : 'bg-slate-50'
                    }`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {notif.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className={`text-sm font-black text-slate-900 truncate mb-1 ${!notif.is_read ? '' : 'opacity-70'}`}>
                        {notif.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Realtime Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-6 right-6 z-[400] animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-4">
            <div className="bg-primary size-10 rounded-xl flex items-center justify-center shrink-0">
              <Bell size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{toast.title}</p>
              <p className="text-[10px] text-slate-400 truncate">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-500 p-1">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
