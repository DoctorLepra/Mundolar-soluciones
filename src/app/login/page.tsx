'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Router, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError.message);
        throw new Error('Credenciales inválidas o error de red.');
      }

      // 1. Check if user needs to change password
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('force_password_change')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) throw new Error(`Error de Perfil: ${profileError.message}`);

      if (profile?.force_password_change) {
        window.location.href = '/auth/actualizar-password';
      } else {
        window.location.href = '/admin';
      }
    } catch (error: any) {
      console.error('Full login process error:', error);
      setError(error.message);
      setLoading(false);
    } 
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/actualizar-password`,
      });

      if (resetError) throw resetError;
      setResetSent(true);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-[440px] z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="size-16 bg-white rounded-[24px] shadow-xl shadow-primary/10 flex items-center justify-center mb-4 border border-slate-100 translate-y-0 hover:translate-y-[-4px] transition-transform duration-300">
             <Router size={32} className="text-primary font-bold" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight text-center">Mundolar Admin</h1>
          <p className="text-slate-500 font-medium mt-1">
            {resetMode ? 'Recupera tu acceso a la plataforma' : 'Ingresa a la plataforma profesional'}
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          
          {resetSent ? (
            <div className="text-center space-y-6 py-4">
               <div className="size-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Mail size={32} />
               </div>
               <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-900">¡Correo Enviado!</h2>
                  <p className="text-slate-500 text-sm font-medium">Revisa tu bandeja de entrada para restablecer tu contraseña.</p>
               </div>
               <button 
                onClick={() => { setResetMode(false); setResetSent(false); setError(null); }}
                className="text-sm font-black text-primary hover:underline hover:text-primary/80"
               >
                 Volver al inicio de sesión
               </button>
            </div>
          ) : resetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 border border-rose-100 animate-in shake duration-500">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    placeholder="ejemplo@mundolar.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white flex items-center justify-center py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-slate-200"
              >
                {loading ? <div className="size-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : 'Enviar recuperación'}
              </button>
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => { setResetMode(false); setError(null); }}
                  className="text-[12px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 border border-rose-100 animate-in shake duration-500">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    placeholder="ejemplo@mundolar.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="pt-2 space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white group flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {loading ? <div className="size-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div> : (
                    <>
                      Iniciar Sesión
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => { setResetMode(true); setError(null); }}
                    className="text-[12px] font-bold text-primary hover:underline transition-all"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-tight">Mundolar Soluciones S.A.S</p>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-8 font-medium">Acceso restringido para personal autorizado.</p>
      </div>
    </div>
  );
}
