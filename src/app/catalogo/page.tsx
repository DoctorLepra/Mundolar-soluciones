
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '@/components/catalog/Sidebar';

// Fetch products with optional category filter
async function getProducts(categoryId?: string) {
  let query = supabase
    .from('products')
    .select('*, brands(name)')
    .eq('status', 'Activo');
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const products = await getProducts(categoria);

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <div className="mb-8 rounded-2xl overflow-hidden relative min-h-[200px] flex items-center bg-slate-900">
          <div className="absolute inset-0 z-0">
            <Image 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
                alt="Banner"
                fill
                sizes="100vw"
                className="object-cover opacity-40"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent z-0"></div>
          <div className="relative z-10 px-8 py-6 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-300 text-xs font-bold mb-3 backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Distribuidor Autorizado Motorola
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 leading-tight">Radios Portátiles y Móviles</h2>
            <p className="text-slate-300 text-sm md:text-base max-w-lg mb-6">Equipos de alto rendimiento para seguridad, logística e industria.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <span className="text-sm font-bold text-slate-900 whitespace-nowrap mr-2">{(products?.length || 0) * 1} Resultados</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-slate-500 hidden sm:inline">Ordenar por:</span>
                <div className="relative">
                    <select className="appearance-none bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-40 p-2.5 pr-8 cursor-pointer font-medium">
                        <option>Relevancia</option>
                        <option>Precio: Menor a Mayor</option>
                        <option>Precio: Mayor a Menor</option>
                        <option>Más nuevos</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">expand_more</span>
                    </div>
                </div>
                <button className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700">
                    <span className="material-symbols-outlined">filter_list</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {products?.map((prod: any) => (
            <div key={prod.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 flex flex-col">
              <Link href={`/producto/${prod.id}`} className="relative aspect-square bg-white p-6 flex items-center justify-center overflow-hidden">
                {prod.original_price && <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10">Oferta</span>}
                <div className="relative w-full h-full">
                    <Image 
                        className="object-contain group-hover:scale-110 transition-transform duration-500" 
                        src={prod.image_url || `https://picsum.photos/400/400?random=${prod.id}`} 
                        alt={prod.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
              </Link>
              <div className="p-5 flex flex-col flex-1">
                <div className="mb-1 flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{prod.brands?.name || 'Marca'}</p>
                  <p className="text-xs text-slate-400">SKU: {prod.sku || `M-${prod.id}`}</p>
                </div>
                <Link href={`/producto/${prod.id}`} className="font-display font-bold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">{prod.name}</Link>
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Mock tags since backend might not have them yet */}
                  {['VHF/UHF', 'IP54'].map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-[11px] font-medium text-slate-600">{tag}</span>
                  ))}
                </div>
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      {prod.original_price && <span className="text-xs text-slate-400 line-through font-medium">${Number(prod.original_price).toFixed(2)}</span>}
                      <span className="font-display font-bold text-xl text-primary block">${Number(prod.price).toFixed(2)}</span>
                    </div>
                    <div className={`text-xs font-bold bg-green-50 text-green-600 px-2 py-1 rounded-full`}>
                      {prod.status || 'En Stock'}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Link href={`/producto/${prod.id}`} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors text-center">Ver Detalles</Link>
                    <button className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products?.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500">
                No se encontraron productos en esta categoría.
            </div>
            )}
        </div>
        
        <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-2">
                <button className="size-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="size-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold transition-colors">1</button>
                <button className="size-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">2</button>
                <span className="text-slate-400 px-2">...</span>
                <button className="size-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </nav>
        </div>
      </main>
    </div>
  );
}
