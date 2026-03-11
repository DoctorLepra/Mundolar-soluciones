'use client';

import React from 'react';
import { useForm, ValidationError } from '@formspree/react';

export default function Newsletter() {
  const [state, handleSubmit] = useForm("mjgayzab");

  if (state.succeeded) {
    return (
      <section className="bg-primary rounded-2xl overflow-hidden relative max-w-[1440px] mx-auto mb-16 shadow-2xl animate-in fade-in duration-700">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
        <div className="relative z-10 p-8 md:p-16 text-center text-white flex flex-col items-center gap-6">
          <div className="size-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">¡Gracias por suscribirte!</h2>
          <p className="max-w-2xl opacity-90 text-lg">
            Te mantendremos informado sobre las últimas novedades y soluciones en telecomunicaciones.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-primary rounded-2xl overflow-hidden relative max-w-[1440px] mx-auto mb-16 shadow-2xl">
      <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
      <div className="relative z-10 p-8 md:p-16 text-center text-white flex flex-col items-center gap-6">
        <h2 className="text-3xl md:text-4xl font-bold">Mantente Conectado</h2>
        <p className="max-w-2xl opacity-90 text-lg">
          Suscríbete a nuestro boletín para recibir las últimas actualizaciones sobre tecnología de radio, ofertas exclusivas y noticias de la industria.
        </p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-lg gap-3 flex-col sm:flex-row">
          <div className="flex-1 flex flex-col">
            <input 
              name="email"
              id="newsletter-email"
              className="w-full rounded-xl border-none px-6 py-4 text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 outline-none shadow-sm transition-all" 
              placeholder="Ingresa tu correo electrónico" 
              required 
              type="email"
            />
            <ValidationError prefix="Email" field="email" errors={state.errors} className="text-white text-xs mt-1 font-medium bg-red-500/20 rounded px-2" />
          </div>
          <button 
            type="submit" 
            disabled={state.submitting}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
          >
            {state.submitting ? (
              <span className="animate-spin material-symbols-outlined">progress_activity</span>
            ) : (
              'Suscribirse'
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
