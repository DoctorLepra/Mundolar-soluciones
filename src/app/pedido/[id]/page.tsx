'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function OrderRedirectPage() {
  const { id } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'unauthorized'>('loading');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        if (!id) return;

        // 1. Decode ID (base64)
        let decodedId: string;
        try {
          const rawId = id as string;
          // Support both standard and URL-safe base64
          const cleanId = decodeURIComponent(rawId).replace(/-/g, '+').replace(/_/g, '/');
          
          const decoded = window.atob(cleanId);
          console.log('DEBUG - Decoded:', decoded);

          if (!decoded.startsWith('ML-')) {
            throw new Error(`Formato inválido: ${decoded.substring(0, 3)}`);
          }
          decodedId = decoded.replace('ML-', '');
        } catch (e: any) {
          console.error('DEBUG - Decoding error:', e);
          setStatus('error');
          return;
        }

        // 2. Check Authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus('unauthorized');
          return;
        }

        // 3. Check Role (Admin or Vendedor)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile && (profile.role === 'Admin' || profile.role === 'Vendedor')) {
          // 4. Authorized -> Redirect to Admin
          router.push(`/admin/pedidos?id=${decodedId}`);
        } else {
          setStatus('unauthorized');
        }
      } catch (error) {
        console.error('Redirect error:', error);
        setStatus('error');
      }
    };

    handleRedirect();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Verificando Pedido...</h2>
            <p className="text-slate-500 font-display">Estamos validando tus credenciales de acceso.</p>
          </div>
        )}

        {status === 'unauthorized' && (
          <div className="space-y-4">
            <div className="size-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Acceso Restringido</h2>
            <p className="text-slate-500 font-display">
              Solo personal administrativo autorizado puede ver los detalles técnicos de este pedido.
            </p>
            <button 
              onClick={() => router.push('/admin/login')}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors font-display"
            >
              Iniciar Sesión
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="size-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">error</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Link Inválido</h2>
            <p className="text-slate-500 font-display">
              El enlace de seguimiento es incorrecto o ha expirado.
              <br />
              <span className="text-[10px] opacity-50">Ref: {id}</span>
            </p>
            <button 
              onClick={() => router.push('/')}
              className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl transition-colors font-display"
            >
              Volver al Inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
