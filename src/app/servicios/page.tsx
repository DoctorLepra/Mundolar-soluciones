
import React from 'react';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Servicios' };
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ServicesHeroActions from '@/components/services/ServicesHeroActions';

interface Brand {
  id: number;
  name: string;
  image_url: string | null;
}

async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, image_url')
    .eq('status', 'Activo')
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
  return data as Brand[];
}

export default async function ServicesPage() {
  const brands = await getBrands();
  const whatsappNumber = "573052200300";

  const services = [
    {
      title: "Venta de Equipos",
      desc: "Radios análogos, digitales, portátiles, móviles, repetidores, controladores, gateways, equipos poc, antenas, duplexer, fuentes, baterías de respaldo, seguridad y redes.",
      icon: "shopping_cart",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Mantenimiento",
      desc: "Servicios de soporte, mantenimiento, asesorías técnica y acompañamiento, aseguramos el correcto funcionamiento de sus radios de comunicación.",
      icon: "check_circle",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Alquiler",
      desc: "Disponemos de una gran variedad de equipos en las bandas UHF y VHF, cumpliendo con los requisitos legales, técnicos y de calidad para su uso.",
      icon: "handshake",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Pruebas en Sitio",
      desc: "Pruebas en sitio en cuanto a cobertura, con diferentes opciones con la finalidad de suministrar el mejor equipo que se ajuste a las necesidades de nuestro cliente.",
      icon: "public",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Programaciones",
      desc: "Programación de sus radios de comunicaciones, optimizando las funcionalidades de los equipos al momento de efectuar las operaciones.",
      icon: "settings_suggest",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    },
    {
      title: "Instalaciones",
      desc: "Servicio con los debidos protocolos y requisitos de seguridad y salud en el trabajo, con personal capacitado para brindar la mejor estabilidad en sus comunicaciones.",
      icon: "local_offer",
      bgIcon: "bg-red-50",
      textColor: "text-red-600"
    }
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-slate-900 min-h-[500px] flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <Image 
            alt="Taller de electrónica Mundolar" 
            className="object-cover opacity-40" 
            src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=2070&auto=format&fit=crop" 
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Centro de Servicio Autorizado</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl max-w-4xl leading-tight">
            Soluciones Expertas en <span className="text-primary">Radiocomunicación</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Mantenemos a su equipo conectado. Desde el mantenimiento de radios portátiles y móviles hasta la instalación de infraestructura compleja.
          </p>
          <ServicesHeroActions />
        </div>
      </section>

      {/* Brands Logo Loop */}
      <section className="border-y border-slate-200 py-12 overflow-hidden bg-white">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <p className="text-center text-sm font-medium text-slate-500 mb-8 uppercase tracking-wider">Distribuidor Autorizado De</p>
          
          <div className="relative">
            <div className="logo-loop-container gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {brands.length > 0 ? (
                [...brands, ...brands, ...brands].map((brand, idx) => (
                  <div key={`${brand.id}-${idx}`} className="relative h-12 w-32 md:w-40 flex items-center justify-center shrink-0">
                    {brand.image_url ? (
                      <Image 
                        src={brand.image_url} 
                        alt={brand.name} 
                        fill 
                        className="object-contain"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{brand.name}</h3>
                    )}
                  </div>
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <React.Fragment key={i}>
                    <h3 className="text-2xl font-bold font-sans italic text-slate-800 shrink-0">MOTOROLA</h3>
                    <h3 className="text-2xl font-bold font-serif text-slate-800 shrink-0">KENWOOD</h3>
                    <h3 className="text-2xl font-black tracking-tighter text-slate-800 shrink-0">Hytera</h3>
                    <h3 className="text-2xl font-bold tracking-widest text-slate-800 shrink-0">ICOM</h3>
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <div id="servicios-grid" className="w-full bg-[#f6f7f8] px-6 py-16 lg:px-20 scroll-mt-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-4 md:text-center md:items-center">
            <h2 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-[#0d141b] sm:text-5xl">
              Servicios Integrales de Comunicación
            </h2>
            <p className="max-w-2xl text-base text-[#4c739a]">
              Soporte técnico a medida para mantener sus operaciones en marcha, desde unidades individuales hasta gestión completa de flotas.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <div key={i} className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl border border-transparent hover:border-slate-100">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${s.bgIcon} ${s.textColor}`}>
                  <span className="material-symbols-outlined text-[32px] font-bold">{s.icon}</span>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-extrabold text-[#0d141b]">{s.title}</h3>
                  <p className="text-base leading-relaxed text-[#4c739a] font-medium">{s.desc}</p>
                </div>
                <div className="mt-auto pt-4">
                  <Link 
                    target="_blank"
                    className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all group" 
                    href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=Hola%20estoy%20interesado%20en%20el%20servicio%20de%20${encodeURIComponent(s.title)}`}
                  >
                    <span>Más información</span>
                    <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer Call to Action */}
      <section className="bg-primary rounded-2xl overflow-hidden relative max-w-[1440px] mx-auto mb-16 shadow-2xl">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
        <div className="relative z-10 p-8 md:p-16 text-center text-white flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold">¿Listo para optimizar su flota?</h2>
          <p className="max-w-2xl opacity-90 text-lg">
            Contacte a nuestro equipo de ingeniería hoy para una consulta gratuita o para programar una recolección de mantenimiento.
          </p>
          <div className="flex w-full max-w-lg gap-3 justify-center">
            <Link 
              href="/contacto" 
              className="bg-white hover:bg-slate-50 text-primary font-bold py-4 px-10 rounded-xl transition-all hover:scale-105 shadow-lg whitespace-nowrap"
            >
              Contáctenos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
