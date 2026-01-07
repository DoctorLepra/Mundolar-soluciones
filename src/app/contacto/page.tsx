
import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
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
                <form className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Nombre Completo</span>
                      <input className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" placeholder="Tu nombre" type="text"/>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Correo Electrónico</span>
                      <input className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" placeholder="ejemplo@correo.com" type="email"/>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Teléfono (Opcional)</span>
                      <input className="w-full rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" placeholder="+56 9 1234 5678" type="tel"/>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[#0d141b] text-sm font-medium">Tipo de consulta</span>
                      <div className="relative">
                        <select className="w-full appearance-none rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" defaultValue="">
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
                    </label>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className="text-[#0d141b] text-sm font-medium">Mensaje</span>
                    <textarea className="w-full resize-none rounded-lg border border-[#cfdbe7] bg-slate-50 px-4 py-3 text-base text-[#0d141b] placeholder-[#94a3b8] focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none" placeholder="Describe cómo podemos ayudarte..." rows={5}></textarea>
                  </label>
                  <div className="pt-2">
                    <button className="w-full md:w-auto min-w-[200px] flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-primary-dark transition-colors" type="submit">
                      <span>Enviar Mensaje</span>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
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
                    <p className="mt-1 text-sm text-[#4c739a]">Av. Providencia 1234, Of. 601<br/>Providencia, Santiago, Chile</p>
                  </div>
                </div>
                <div className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e7edf3] hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d141b]">Llámanos</h3>
                    <p className="mt-1 text-sm text-[#4c739a]">Lun-Vie de 9am a 6pm</p>
                    <a className="text-sm font-medium text-[#0d141b] hover:text-primary mt-1 block" href="tel:+56912345678">+56 9 1234 5678</a>
                  </div>
                </div>
                <div className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-[#e7edf3] hover:border-primary/30 transition-colors shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0d141b]">Escríbenos</h3>
                    <p className="mt-1 text-sm text-[#4c739a]">Respondemos en menos de 24 hrs</p>
                    <a className="text-sm font-medium text-[#0d141b] hover:text-primary mt-1 block" href="mailto:ventas@mundolarsoluciones.cl">ventas@mundolarsoluciones.cl</a>
                  </div>
                </div>
              </div>
              <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-[#e7edf3] shadow-sm group">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{backgroundImage: "url('https://picsum.photos/600/400?grayscale&random=99')"}}>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl text-primary drop-shadow-md">location_on</span>
                  <div className="mt-1 rounded-md bg-white px-2 py-1 text-xs font-bold text-[#0d141b] shadow-lg">Mundolar</div>
                </div>
                <a className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0d141b] shadow-md hover:bg-slate-50" href="#">
                  <span>Ver en Google Maps</span>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 border-t border-[#e7edf3]">
        <div className="max-w-7xl mx-auto flex justify-center px-4 md:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-[960px] w-full bg-slate-100 rounded-2xl p-8 md:p-10">
            <div className="flex flex-col gap-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
                <span className="material-symbols-outlined">help</span>
                <span className="text-sm font-bold uppercase tracking-wide">Preguntas Frecuentes</span>
              </div>
              <h3 className="text-2xl font-bold text-[#0d141b]">¿Tienes dudas rápidas?</h3>
              <p className="text-[#4c739a] max-w-md">Antes de escribirnos, revisa nuestra sección de ayuda. Es posible que encuentres la respuesta que buscas inmediatamente.</p>
            </div>
            <Link href="/servicios" className="shrink-0 rounded-lg bg-slate-200 hover:bg-slate-300 px-6 py-3 text-base font-bold text-[#0d141b] transition-colors">
              Ver Centro de Ayuda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
