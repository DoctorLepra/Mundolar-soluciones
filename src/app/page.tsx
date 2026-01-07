
import { supabase } from '@/lib/supabase';
import Hero from '@/components/home/Hero';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Category {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  brands: { name: string } | null; // Handle array or single object depending on relation
}

// Data Fetching Functions
async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      original_price,
      status,
      brands (name)
    `)
    .eq('is_featured', true)
    .limit(8);

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
  return data || [];
}

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, description, image_url')
    .eq('status', 'Activo')
    .is('parent_id', null)
    .limit(4)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data as Category[] || [];
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const categories = await getCategories();

  return (
    <div className="space-y-16 py-6 md:py-10">
      <Hero />

      <section className="border-y border-slate-200 py-10">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <p className="text-center text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">Distribuidor Autorizado De</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <h3 className="text-2xl font-bold font-sans italic text-slate-800">MOTOROLA</h3>
            <h3 className="text-2xl font-bold font-serif text-slate-800">KENWOOD</h3>
            <h3 className="text-2xl font-black tracking-tighter text-slate-800">Hytera</h3>
            <h3 className="text-2xl font-bold tracking-widest text-slate-800">ICOM</h3>
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 md:px-10 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Nuestras Categorías</h2>
            <p className="text-slate-600 max-w-2xl">Explore nuestra amplia gama de soluciones de telecomunicaciones profesionales adaptadas a su industria.</p>
          </div>
          <Link href="/catalogo" className="text-primary font-bold hover:underline flex items-center gap-1">
            Ver Todas las Categorías <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link key={cat.id} href="/catalogo" className="group block relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="aspect-[4/3] relative bg-slate-100 group-hover:scale-105 transition-transform duration-500">
                 <Image 
                    src={cat.image_url || `https://picsum.photos/400/300?random=${cat.id}`} 
                    alt={cat.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover"
                 />
              </div>
              <div className="p-4 relative bg-white">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Novedades y Destacados</h2>
            <div className="flex gap-2">
                <button className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-8 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar snap-x snap-mandatory">
          {featuredProducts.map((product: any) => (
              <div key={product.id} className="snap-start min-w-[280px] md:min-w-[300px] flex flex-col rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all">
                  <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl bg-slate-50 p-6 flex items-center justify-center">
                      {product.original_price && (
                          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide z-10">Oferta</span>
                      )}
                      <div className="relative w-full h-full">
                        <Image 
                            src={`https://picsum.photos/300/300?random=${product.id}`}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-contain"
                        />
                      </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-3">
                      <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{product.brands?.name || 'Marca'}</p>
                          <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                      </div>
                      <div className="flex items-end justify-between mt-auto">
                          <div>
                              {product.original_price && (
                                  <p className="text-slate-400 text-xs line-through">${Number(product.original_price).toFixed(2)}</p>
                              )}
                              <p className="text-xl font-bold text-primary">${Number(product.price).toFixed(2)}</p>
                          </div>
                          <button className="flex items-center justify-center size-10 rounded-full bg-slate-100 text-slate-900 hover:bg-primary hover:text-white transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                          </button>
                      </div>
                  </div>
              </div>
          ))}
        </div>
      </section>

      <section className="bg-primary/5 rounded-2xl p-8 md:p-12 max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">Servicios Integrales de Telecomunicaciones</h2>
          <p className="text-slate-600">No solo vendemos radios; aseguramos que su infraestructura de comunicación sea robusta, confiable y esté lista para todo.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-3xl">settings_input_antenna</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Instalación</h3>
            <p className="text-sm text-slate-500">Configuración profesional de repetidoras, antenas y estaciones base móviles.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-3xl">build_circle</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Reparación</h3>
            <p className="text-sm text-slate-500">Técnicos certificados listos para reparar fallas de hardware y mantenimiento.</p>
          </div>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-3xl">support_agent</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Consultoría</h3>
            <p className="text-sm text-slate-500">Asesoramiento experto para diseñar la red de comunicación perfecta.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary rounded-2xl overflow-hidden relative max-w-[1440px] mx-auto mb-16">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")'}}></div>
        <div className="relative z-10 p-8 md:p-16 text-center text-white flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold">Mantente Conectado</h2>
          <p className="max-w-xl opacity-90 text-lg">Suscríbete a nuestro boletín para recibir las últimas actualizaciones sobre tecnología de radio.</p>
          <form className="flex w-full max-w-md gap-2 flex-col sm:flex-row">
            <input className="flex-1 rounded-lg border-none px-4 py-3 text-slate-900 focus:ring-2 focus:ring-white/50 outline-none" placeholder="Ingresa tu correo electrónico" required type="email"/>
            <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg transition-colors">Suscribirse</button>
          </form>
        </div>
      </section>
    </div>
  );
}
