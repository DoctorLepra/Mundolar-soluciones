'use client';

import React from 'react';
import { useForm, ValidationError } from '@formspree/react';
import { usePageTitle } from '@/hooks/usePageTitle';
import Link from 'next/link';

export default function ContactPage() {
  usePageTitle('Contacto');
  const [state, handleSubmit] = useForm("mjgayzab");

  if (state.succeeded) {
    return (
      <div className="w-full bg-slate-50 min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-[#e7edf3] animate-in fade-in zoom-in duration-500">
          <div className="size-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
          </div>
          <h2 className="text-3xl font-black text-[#0d141b] mb-4">¡Mensaje Enviado!</h2>
          <p className="text-[#4c739a] mb-8 font-medium text-lg">
            Gracias por contactarnos. Hemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.
          </p>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">home</span>
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50">
      <section className="relative bg-white py-12 md:py-20 border-b border-[#e7edf3]">
        <div className="max-w-7xl mx-auto flex justify-center px-4 md:px-10">
          <div className="flex flex-col items-center max-w-[800px] text-center gap-4">
            <span className="text-primary font-bold text-sm uppercase tracking-wider">Servicio al Cliente</span>
            <h1 className="text-[#0d141b] text-4xl md:text-5xl font-black leading-tight">
              Hablemos de Soluciones
            </h1>
            <p className="text-[#4c739a] text-lg md:text-xl font-normal leading-relaxed max-w-2xl">
              Expertos en radios portátiles, móviles y repuestos. Estamos aquí para responder tus consultas técnicas y comerciales.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto flex justify-center px-4 md:px-10">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 flex flex-col gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-[#e7edf3] p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#0d141b] mb-6">Envíanos un mensaje</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Nombre Completo</span>
                      <input 
                        name="name"
                        id="name"
                        required
                        className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" 
                        placeholder="Tu nombre" 
                        type="text"
                      />
                      <ValidationError prefix="Name" field="name" errors={state.errors} className="text-xs text-red-500 font-medium" />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Correo Electrónico</span>
                      <input 
                        name="email"
                        id="email"
                        required
                        className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" 
                        placeholder="ejemplo@correo.com" 
                        type="email"
                      />
                      <ValidationError prefix="Email" field="email" errors={state.errors} className="text-xs text-red-500 font-medium" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Teléfono (Opcional)</span>
                      <input 
                        name="phone"
                        id="phone"
                        className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" 
                        placeholder="+57 305 220 0300" 
                        type="tel"
                      />
                      <ValidationError prefix="Phone" field="phone" errors={state.errors} className="text-xs text-red-500 font-medium" />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Tipo de consulta</span>
                      <div className="relative">
                        <select 
                          name="subject"
                          id="subject"
                          className="w-full appearance-none rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" 
                          defaultValue=""
                        >
                          <option disabled value="">Selecciona una opción</option>
                          <option value="ventas">Ventas y Cotizaciones</option>
                          <option value="tecnico">Servicio Técnico</option>
                          <option value="repuestos">Repuestos</option>
                          <option value="otros">Otros</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#4c739a]">
                          <span className="material-symbols-outlined">expand_more</span>
                        </div>
                      </div>
                      <ValidationError prefix="Subject" field="subject" errors={state.errors} className="text-xs text-red-500 font-medium" />
                    </label>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="text-[#0d141b] text-sm font-medium">Mensaje</span>
                    <textarea 
                      name="message"
                      id="message"
                      required
                      className="w-full resize-none rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" 
                      placeholder="Describe cómo podemos ayudarte..." 
                      rows={5}
                    ></textarea>
                    <ValidationError prefix="Message" field="message" errors={state.errors} className="text-xs text-red-500 font-medium" />
                  </label>
                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={state.submitting}
                      className="w-full md:w-auto min-w-[200px] flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-base font-bold text-white shadow-md hover:bg-primary-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                    >
                      {state.submitting ? (
                        <>
                          <span className="animate-spin material-symbols-outlined">progress_activity</span>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <span>Enviar Mensaje</span>
                          <span className="material-symbols-outlined text-[20px]">send</span>
                        </>
                      )}
                    </button>
                    {state.errors && state.errors.getFormErrors().length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
                        Hubo un error al enviar el formulario. Por favor intenta de nuevo.
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e7edf3] hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d141b]">Nuestra Oficina</h3>
                    <p className="mt-1 text-sm text-[#4c739a]">Carrera 7 #156 - 68 Ed. North Point III<br/>Bogotá D.C., Colombia</p>
                  </div>
                </div>
                <div className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e7edf3] hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d141b]">Llámanos</h3>
                    <p className="mt-1 text-sm text-[#4c739a]">Lun-Vie de 8am a 6pm</p>
                    <a className="text-sm font-medium text-[#0d141b] hover:text-primary mt-1 block" href="tel:+573052200300">+57 305 220 0300</a>
                  </div>
                </div>
                <div className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e7edf3] hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d141b]">Escríbenos</h3>
                    <p className="mt-1 text-sm text-[#4c739a]">Respondemos en menos de 24 hrs</p>
                    <a className="text-sm font-medium text-[#0d141b] hover:text-primary mt-1 block" href="mailto:ventas@mundolarsoluciones.com">ventas@mundolarsoluciones.com</a>
                  </div>
                </div>
              </div>
              <div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-[#e7edf3] shadow-sm">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.2241417870996!2d-74.0238588!3d4.731087099999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f8f8ec5a66bd1%3A0x935ce56e5e7590e2!2zQWsgNyAjMTU2LTY4LCBVc2FxdcOpbiwgQm9nb3TDoQ!5e0!3m2!1ses-419!2sco!4v1772770342479!5m2!1ses-419!2sco" 
                  className="w-full h-full border-0" 
                  allowFullScreen={true}
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Mundolar - North Point III"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
