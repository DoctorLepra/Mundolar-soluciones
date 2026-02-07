'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Validation states
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword && password !== '';

  const isFormValid = hasMinLength && hasUppercase && hasSpecialChar && passwordsMatch;

  useEffect(() => {
    // 1. Initial check (in case session is already there)
    checkUser();

    // 2. Continuous listener for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      console.log('Auth state changed:', _event, session ? 'Session active' : 'No session');
      if (session) {
        setIsCheckingSession(false);
        setError(null);
      }
    });

    // 3. Manual Fragment Capture (Infallible Fallback)
    // Sometimes Supabase SSR takes too long to process the hash in Next.js
    const handleManualToken = async () => {
      try {
        const hash = window.location.hash.substring(1);
        if (!hash) return;

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Manual token detection triggered');
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (data.session) {
            setIsCheckingSession(false);
          }
          if (setSessionError) throw setSessionError;
        }
      } catch (err) {
        console.error('Manual token error:', err);
      }
    };

    handleManualToken();

    // 4. Safety Timeout: If after 8 seconds nothing happens, show error or retry
    const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            if (window.location.hash.includes('access_token')) {
                setError("No se pudo detectar la sesión automáticamente. Por favor, recarga la página o intenta de nuevo con el link del correo.");
            } else {
                router.push('/login?error=Invitación no válida o expirada');
            }
            setIsCheckingSession(false);
        }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (session) {
        setIsCheckingSession(false);
      }
    } catch (err: any) {
      console.error('Session error:', err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Update Supabase Auth Password
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) throw authError;

      // 2. Update Profile to set force_password_change = false
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('id', user.id);
      }

      // Final success: go to admin portal
      window.location.href = '/admin';
    } catch (err: any) {
      console.error('Update error:', err.message);
      setError('No se pudo establecer la contraseña. El link podría haber expirado o la sesión no es válida.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="size-16 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100 animate-bounce">
            <ShieldCheck size={32} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Validando Invitación...</h2>
            <p className="text-slate-500 text-sm">Estamos conectando tu cuenta segura. Por favor espera un momento.</p>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full animate-progress-indefinite"></div>
          </div>
          <button 
             onClick={() => window.location.reload()}
             className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter"
          >
             ¿Tarda mucho? Recargar página
          </button>
        </div>
      </div>
    );
  }

  const ValidationItem = ({ label, met }: { label: string, met: boolean }) => (
    <div className={`flex items-center gap-2 text-xs font-bold transition-colors ${met ? 'text-emerald-500' : 'text-slate-400'}`}>
      {met ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="text-center mb-8">
            <div className="size-16 bg-white rounded-[24px] shadow-xl shadow-primary/10 flex items-center justify-center mb-4 border border-slate-100 mx-auto">
                <ShieldCheck size={32} className="text-primary" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 font-display tracking-tight">Bienvenido a Mundolar</h1>
            <p className="text-slate-500 font-medium text-sm mt-2">Configura tu contraseña para activar tu cuenta profesional.</p>
        </div>

        {/* Form Container */}
        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
           <form onSubmit={handleUpdatePassword} className="space-y-6">
             
             {error && (
               <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 border border-rose-100">
                 <AlertCircle size={18} />
                 <p className="text-xs font-bold">{error}</p>
               </div>
             )}

             <div className="space-y-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nueva Contraseña</label>
               <input 
                 type="password" 
                 required
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
             </div>

             <div className="space-y-1.5">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Contraseña</label>
               <input 
                 type="password" 
                 required
                 className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 onPaste={(e) => e.preventDefault()}
               />
             </div>

             {/* Requirements Grid */}
             <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Seguridad de la Cuenta</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ValidationItem label="Mínimo 6 caracteres" met={hasMinLength} />
                  <ValidationItem label="Una Mayúscula" met={hasUppercase} />
                  <ValidationItem label="Carácter Especial" met={hasSpecialChar} />
                  <ValidationItem label="Las claves coinciden" met={passwordsMatch} />
               </div>
             </div>

             <button 
               type="submit"
               disabled={!isFormValid || loading}
               className="w-full bg-slate-900 text-white flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-slate-200"
             >
               {loading ? (
                  <div className="size-5 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
               ) : (
                 <>
                   <ShieldCheck size={20} />
                   Activar Cuenta y Entrar
                 </>
               )}
             </button>
           </form>
        </div>
      </div>
    </div>
  );
}
