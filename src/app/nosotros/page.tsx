
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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">flag</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Nuestra Misión</h3>
            <p className="text-slate-600 leading-relaxed">
              Proporcionar soluciones de comunicación confiables y de vanguardia que permitan a los equipos coordinarse de manera efectiva y segura.
            </p>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">visibility</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Nuestra Visión</h3>
            <p className="text-slate-600 leading-relaxed">
              Ser el referente líder en tecnología de radio y servicio técnico, conocidos por la innovación y un compromiso inquebrantable con la calidad.
            </p>
          </div>
          <div className="group relative overflow-hidden rounded-xl bg-white p-8 shadow-sm transition-all hover:shadow-md border border-slate-100">
            <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-3xl">handshake</span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Valores Centrales</h3>
            <p className="text-slate-600 leading-relaxed">
              Integridad en cada trato, excelencia técnica en cada reparación y un enfoque en el cliente que define nuestras operaciones diarias.
            </p>
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

      <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Conoce a los Expertos</h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Las personas detrás de la tecnología. Nuestro equipo de ingenieros y especialistas certificados.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map(member => (
            <div key={member.name} className="group flex flex-col items-center text-center">
              <div className="relative mb-4 size-40 overflow-hidden rounded-full border-4 border-slate-100 group-hover:border-primary transition-colors">
                <Image 
                    alt={`Retrato de ${member.name}`} 
                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                    src={member.img}
                    fill
                    sizes="160px"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
              <p className="text-sm text-primary font-medium">{member.role}</p>
              <p className="mt-2 text-sm text-slate-500">{member.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-primary py-16">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">¿Listo para mejorar tu comunicación?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            Explora nuestro catálogo de radios portátiles y móviles de primer nivel o contacta a nuestro equipo para una cotización personalizada.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link href="/catalogo" className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-bold text-primary transition-all hover:bg-slate-50 shadow-lg">
              <span className="material-symbols-outlined mr-2">shopping_bag</span>
              Comprar Ahora
            </Link>
            <Link href="/contacto" className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 text-base font-bold text-white transition-all hover:bg-white/10">
              Contactar Soporte
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
