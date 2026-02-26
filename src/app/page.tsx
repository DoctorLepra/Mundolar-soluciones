
import React from 'react';
import { supabase } from '@/lib/supabase';
import Hero from '@/components/home/Hero';
import ProductCarousel from '@/components/home/ProductCarousel';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Category {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
}

interface Brand {
  id: number;
  name: string;
  image_url: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  price_with_iva: number | null;
  description: string | null;
  image_urls: string[] | null;
  brands: { name: string } | { name: string }[] | null;
  isBestSeller?: boolean;
}

// Data Fetching Functions
async function getFeaturedProducts() {
  // Fetch top 5 best selling products based on order_items quantity
  const { data: salesData } = await supabase
    .from('order_items')
    .select('product_id, quantity');

  const productSales: Record<number, number> = {};
  salesData?.forEach(item => {
    productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
  });

  const topProductIds = Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => parseInt(id));

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      original_price,
      price_with_iva,
      status,
      image_urls,
      brands (name),
      categories (name)
    `)
    .eq('status', 'Activo')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }

  return (data as any[]).map(p => ({
    ...p,
    isBestSeller: topProductIds.includes(p.id)
  })) as Product[];
}

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, description, image_url, position')
    .eq('status', 'Activo')
    .is('parent_id', null)
    .limit(4)
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data as Category[] || [];
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

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const categories = await getCategories();
  const brands = await getBrands();

  return (
    <div className="space-y-16 py-6 md:py-10">
      <Hero />

      <section className="border-y border-slate-200 py-10 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 md:px-10">
          <p className="text-center text-sm font-medium text-slate-500 mb-8 uppercase tracking-wider">Distribuidor Autorizado De</p>
          
          <div className="relative">
            <div className="logo-loop-container gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {brands.length > 0 ? (
                // Repeat brands 3 times to ensure the loop is always full
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
                // Static Fallback repeated for the loop
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
            <Link key={cat.id} href={`/catalogo?categoria=${cat.id}`} className="group block relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
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

      <ProductCarousel products={featuredProducts} />

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
          <p className="max-w-2xl opacity-90 text-lg">
            Suscríbete a nuestro boletín para recibir las últimas actualizaciones sobre tecnología de radio, ofertas exclusivas y noticias de la industria.
          </p>
          <form className="flex w-full max-w-lg gap-3 flex-col sm:flex-row">
            <input 
              className="flex-1 rounded-xl border-none px-6 py-4 text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-white/50 outline-none shadow-sm" 
              placeholder="Ingresa tu correo electrónico" 
              required 
              type="email"
            />
            <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-lg">
              Suscribirse
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
