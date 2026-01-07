
import Link from 'next/link';
import Image from 'next/image';

export default function ServicesPage() {
  return (
    <div className="w-full">
      <div className="w-full bg-white px-6 py-4 lg:px-20 border-b border-[#e7edf3]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <Link className="text-[#4c739a] text-sm font-medium hover:underline" href="/">Inicio</Link>
          <span className="text-[#4c739a] text-sm">/</span>
          <span className="text-[#0d141b] text-sm font-semibold">Servicios</span>
        </div>
      </div>

      <div className="w-full px-6 py-8 lg:px-20 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-2xl bg-[#101922] min-h-[500px] flex items-center">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>
              <Image 
                alt="Taller de electrónica" 
                className="object-cover opacity-60" 
                src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=2070&auto=format&fit=crop" 
                fill
                sizes="100vw"
                priority
              />
            </div>
            <div className="relative z-10 flex flex-col gap-6 px-6 py-16 md:px-12 md:py-24 lg:max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Centro de Servicio Autorizado</span>
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Soluciones Expertas en Radiocomunicación
              </h1>
              <p className="text-lg font-light leading-relaxed text-gray-200">
                Mantenemos a su equipo conectado. Desde el mantenimiento de radios portátiles y móviles hasta la instalación de infraestructura compleja.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/contacto" className="flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-600">
                  Solicitar Cotización
                </Link>
                <Link href="/catalogo" className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-8 py-3 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                  Ver Productos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-b border-[#e7edf3] bg-white px-6 py-8 lg:px-20">
        <div className="mx-auto max-w-7xl text-center">
          <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-[#4c739a]">Con la confianza de los principales fabricantes</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale transition-all hover:grayscale-0">
            <div className="flex items-center gap-2 text-xl font-bold text-[#0d141b]"><span className="material-symbols-outlined">radio_button_checked</span> MOTOROLA</div>
            <div className="flex items-center gap-2 text-xl font-bold text-[#0d141b]"><span className="material-symbols-outlined">wifi_tethering</span> KENWOOD</div>
            <div className="flex items-center gap-2 text-xl font-bold text-[#0d141b]"><span className="material-symbols-outlined">satellite_alt</span> ICOM</div>
            <div className="flex items-center gap-2 text-xl font-bold text-[#0d141b]"><span className="material-symbols-outlined">router</span> HYTERA</div>
          </div>
        </div>
      </div>

      <div className="w-full bg-[#f6f7f8] px-6 py-16 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-4 md:text-center md:items-center">
            <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-[#0d141b] sm:text-4xl">
              Servicios Integrales de Comunicación
            </h2>
            <p className="max-w-2xl text-base text-[#4c739a]">
              Soporte técnico a medida para mantener sus operaciones en marcha, desde unidades individuales hasta gestión completa de flotas.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: 'build', title: 'Mantenimiento y Reparación', desc: 'Diagnóstico completo y reparación a nivel de componente. Utilizamos repuestos originales para garantizar estándares de fábrica.' },
              { icon: 'settings_input_antenna', title: 'Programación y Configuración', desc: 'Configuración experta de frecuencias, gestión de flotas, actualizaciones de firmware y servicios de migración digital.' },
              { icon: 'cell_tower', title: 'Instalación de Infraestructura', desc: 'Estudios de sitio completos e instalación de estaciones base, repetidores y sistemas de antenas para áreas de cobertura robustas.' },
              { icon: 'support_agent', title: 'Soporte Técnico 24/7', desc: 'Soporte remoto y en sitio para fallos críticos de comunicación. Nos aseguramos de que su equipo nunca esté desconectado.' },
              { icon: 'shopping_cart', title: 'Venta de Repuestos', desc: 'Acceso directo a baterías, antenas, clips y carcasas genuinas para todas las principales marcas de radio a precios competitivos.' },
              { icon: 'handshake', title: 'Consultoría de Sistemas', desc: '¿Necesita una solución personalizada? Nuestros ingenieros diseñan redes de comunicación escalables adaptadas a su industria.' }
            ].map((s, i) => (
              <div key={i} className="group relative flex flex-col gap-4 rounded-xl border border-[#e7edf3] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[28px]">{s.icon}</span>
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-[#0d141b]">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#4c739a]">{s.desc}</p>
                </div>
                <div className="mt-auto pt-4">
                  <Link className="inline-flex items-center text-sm font-bold text-primary hover:underline" href="/contacto">
                    Más información <span className="material-symbols-outlined ml-1 text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="w-full bg-white px-6 py-16 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-[#0d141b] sm:text-4xl">Nuestro Proceso de Reparación</h2>
            <p className="mt-2 text-[#4c739a]">Transparente y eficiente de principio a fin.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute left-0 top-[26px] h-0.5 w-full bg-[#e7edf3]"></div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-4">
              {[
                {icon: 'stethoscope', title: 'Diagnóstico', desc: 'Análisis completo en 24h'},
                {icon: 'description', title: 'Cotización', desc: 'Costo detallado y repuestos'},
                {icon: 'build_circle', title: 'Reparación', desc: 'Servicio experto y calibración'},
                {icon: 'local_shipping', title: 'Entrega', desc: 'Retorno seguro a su oficina'}
              ].map((step, i) => (
                <div key={i} className="relative flex flex-row items-center gap-4 md:flex-col md:text-center">
                  <div className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 shadow-sm ${i === 0 ? 'border-primary text-primary bg-white' : 'border-gray-200 text-[#0d141b] bg-white'}`}>
                    <span className="material-symbols-outlined">{step.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-[#0d141b]">{step.title}</h3>
                    <p className="text-sm text-[#4c739a]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-12 lg:px-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-primary text-white shadow-xl">
          <div className="flex flex-col items-center justify-between gap-8 px-8 py-12 md:flex-row md:px-16 md:py-16">
            <div className="flex flex-col gap-4 max-w-2xl text-center md:text-left">
              <h2 className="text-3xl font-black leading-tight sm:text-4xl">¿Listo para optimizar su flota?</h2>
              <p className="text-lg font-medium text-blue-100">Contacte a nuestro equipo de ingeniería hoy para una consulta gratuita o para programar una recolección de mantenimiento.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/contacto" className="whitespace-nowrap rounded-lg bg-white px-8 py-3.5 text-base font-bold text-primary shadow-sm hover:bg-gray-50 transition-colors">
                Contáctenos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
