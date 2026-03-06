
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {

  const teamMembers = [
    { name: 'Carlos Méndez', role: 'CEO y Fundador', desc: '15+ años en ingeniería de telecomunicaciones.', img: 'https://picsum.photos/200/200?random=50' },
    { name: 'Sarah Johnson', role: 'Directora de Ventas', desc: 'Experta en estrategias de comunicación empresarial.', img: 'https://picsum.photos/200/200?random=51' },
    { name: 'David Chen', role: 'Técnico Líder', desc: 'Especialista certificado en Motorola Solutions.', img: 'https://picsum.photos/200/200?random=52' },
    { name: 'Elena Rodríguez', role: 'Gerente de Soporte', desc: 'Asegurando la satisfacción del cliente desde 2015.', img: 'https://picsum.photos/200/200?random=53' }
  ];

  return (
    <div className="bg-white">
      <section className="relative w-full overflow-hidden bg-slate-900 min-h-[500px] flex flex-col justify-center">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2069&auto=format&fit=crop" 
            className="object-cover opacity-40" 
            alt="Equipo de Mundolar Soluciones en una reunión" 
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl max-w-4xl leading-tight">
            Conectándote en <span className="text-primary">Todo Lugar</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Somos expertos en soluciones de radiocomunicación portátil y móvil, asegurando que tu equipo permanezca conectado cuando más importa.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/catalogo" className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-bold text-white transition-all hover:bg-primary/90 hover:scale-105">
              Explorar Catálogo
            </Link>
            <Link href="/servicios" className="inline-flex items-center justify-center rounded-lg bg-white/10 px-6 py-3 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20">
              Nuestros Servicios
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <span className="text-3xl font-bold text-primary sm:text-4xl">15+</span>
              <span className="text-sm font-medium text-slate-500">Años de Experiencia</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <span className="text-3xl font-bold text-primary sm:text-4xl">5k+</span>
              <span className="text-sm font-medium text-slate-500">Productos Vendidos</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <span className="text-3xl font-bold text-primary sm:text-4xl">1.2k+</span>
              <span className="text-sm font-medium text-slate-500">Clientes Felices</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 text-center">
              <span className="text-3xl font-bold text-primary sm:text-4xl">24/7</span>
              <span className="text-sm font-medium text-slate-500">Soporte Disponible</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Impulsados por un Propósito</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            En Mundolar Soluciones, no solo vendemos radios; construimos las líneas vitales de comunicación para empresas en toda la región.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">flag</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Misión</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Ser su mejor aliado, distribuir soluciones confiables con productos de última tecnología y servicios profesionales. Establecemos relaciones de largo plazo con nuestros clientes, equipo de trabajo, proveedores y el medio ambiente.
            </p>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">visibility</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Visión</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Ser un integrador fuerte en soluciones, expandirnos a nivel empresarial para llegar a ser la empresa con mayor tecnología en la industria a través de la innovación y talento de las personas que trabajan dentro de la organización.
            </p>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">handshake</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Valores</h3>
            <ul className="text-slate-600 leading-snug text-sm space-y-1">
              <li>• Brindamos soluciones</li>
              <li>• Transmitimos calidad</li>
              <li>• Garantizamos seguridad</li>
              <li>• Siempre comprometidos</li>
              <li>• Trabajo en equipo</li>
              <li>• Innovación tecnológica</li>
              <li>• Responsables con el medio ambiente</li>
            </ul>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">domain</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Sectores</h3>
            <div className="grid grid-cols-2 gap-x-2 text-slate-600 text-[11px] leading-tight">
              <ul className="space-y-1">
                <li>• Comercial</li>
                <li>• Educación</li>
                <li>• Hotelería</li>
                <li>• Banca</li>
                <li>• Salud</li>
              </ul>
              <ul className="space-y-1">
                <li>• Manufactura</li>
                <li>• Seguridad Privada</li>
                <li>• Transporte Logística</li>
                <li>• Construcción</li>
                <li>• Minero – Energético</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Nuestra Trayectoria</h2>
          </div>
          <div className="relative">
            <div className="grid grid-cols-[60px_1fr] gap-x-6 sm:gap-x-12">
              {[
                { year: '2008', title: 'Inicios', desc: 'Mundolar Soluciones comenzó como una pequeña tienda local proporcionando reparaciones básicas de radios a empresas de seguridad locales.', icon: 'storefront' },
                { year: '2012', title: 'Expansión Regional', desc: 'Expandimos nuestros servicios para cubrir toda la región, asegurando alianzas con importantes empresas de construcción y logística.', icon: 'map' },
                { year: '2018', title: 'Transformación Digital', desc: 'Lanzamiento de nuestra plataforma de comercio electrónico, haciendo accesible el equipo de radio profesional a una audiencia nacional.', icon: 'public' },
                { year: '2023', title: 'Excelencia en Servicio', desc: 'Inauguración de nuestro laboratorio de reparaciones de última generación, certificado por marcas importantes como Motorola y Kenwood.', icon: 'build_circle' }
              ].map((item, index, arr) => (
                <React.Fragment key={index}>
                  <div className="flex flex-col items-center">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-full border-2 z-10 shadow-sm ${index === 0 ? 'bg-white border-primary text-primary' : 'bg-white border-slate-300 text-slate-500'}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    {index < arr.length - 1 && <div className="h-full w-0.5 bg-slate-300 -my-2"></div>}
                  </div>
                  <div className={`pt-2 ${index < arr.length - 1 ? 'pb-12' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full w-fit ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'}`}>{item.year}</span>
                    </div>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-white py-12">
        <div className="w-full mb-12">
          <Image 
              alt="Mundolar - Responsabilidad Ambiental" 
              src="/img/planeta.png"
              width={1920}
              height={600}
              className="w-full h-auto"
              priority
          />
        </div>
        <div className="flex justify-center">
          <Link 
            href="https://api.whatsapp.com/send?phone=573052200300&text=Hola,%20quiero%20entregar%20mis%20bater%C3%ADas%20usadas" 
            target="_blank"
            className="inline-flex items-center justify-center rounded-lg bg-[#25D366] px-8 py-4 text-lg font-bold text-white transition-all hover:scale-105 shadow-lg"
          >
            <span className="material-symbols-outlined mr-2">battery_charging_full</span>
            Entregar Baterías
          </Link>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="bg-primary rounded-2xl overflow-hidden relative max-w-[1440px] mx-auto mb-16 shadow-2xl">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
        <div className="relative z-10 p-8 md:p-16 text-center text-white flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold">¿Listo para mejorar tu comunicación?</h2>
          <p className="max-w-2xl opacity-90 text-lg">
            Explora nuestro catálogo de radios portátiles y móviles de primer nivel o contacta a nuestro equipo para una cotización personalizada.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link href="/catalogo" className="bg-white hover:bg-slate-50 text-primary font-bold py-4 px-10 rounded-xl transition-all hover:scale-105 shadow-xl whitespace-nowrap">
              Comprar Ahora
            </Link>
            <Link 
              href="https://api.whatsapp.com/send?phone=573052200300&text=Hola,%20necesito%20soporte%20t%C3%A9cnico%20para%20mis%20equipos" 
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white px-8 py-4 text-base font-bold text-white transition-all hover:bg-white/10"
            >
              Contactar Soporte
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
