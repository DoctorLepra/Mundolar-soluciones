
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Sidebar from '@/components/catalog/Sidebar';
import SortSelector from '@/components/catalog/SortSelector';
import ProductCard from '@/components/catalog/ProductCard';

// Fetch products with multiple filters and pagination
async function getProducts(params: { 
  categoria?: string; 
  marca?: string; 
  oferta?: string; 
  minPrice?: string; 
  maxPrice?: string; 
  sort?: string;
  page?: string;
}) {
  const limit = 16;
  const page = parseInt(params.page || '1');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('products')
    .select('*, brands(name), categories(name)', { count: 'exact' })
    .eq('status', 'Activo');
  
  if (params.categoria) {
    const categoryIds = params.categoria.split(',');
    query = query.in('category_id', categoryIds);
  }

  if (params.marca) {
    const brandIds = params.marca.split(',');
    query = query.in('brand_id', brandIds);
  }

  if (params.oferta === 'true') {
    query = query.not('original_price', 'is', null);
  }

  if (params.minPrice) {
    const minBase = Number(params.minPrice) / 1.19;
    query = query.gte('price', minBase);
  }

  if (params.maxPrice) {
    const maxBase = Number(params.maxPrice) / 1.19;
    query = query.lte('price', maxBase);
  }

  // Sorting
  switch (params.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('name', { ascending: true });
  }

  // Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching products:', error);
    return { products: [], totalCount: 0 };
  }
  return { products: data, totalCount: count || 0 };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    categoria?: string; 
    marca?: string; 
    oferta?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const { products, totalCount } = await getProducts(params);
  const currentPage = parseInt(params.page || '1');
  const totalPages = Math.ceil(totalCount / 16);

  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams(params as any);
    urlParams.set('page', pageNumber.toString());
    return `/catalogo?${urlParams.toString()}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-160px)] overflow-hidden">
      {/* Sidebar con scroll independiente */}
      <div className="w-full lg:w-72 xl:w-80 h-auto lg:h-full lg:overflow-y-auto border-r border-slate-100 p-4 lg:p-8 custom-scrollbar bg-white z-20">
        <Sidebar />
      </div>

      {/* Área de productos con scroll independiente */}
      <main className="flex-1 h-auto lg:h-full lg:overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-slate-900">Catálogo de Productos</h1>
          <nav className="text-sm text-slate-500">
            <Link href="/" className="hover:text-primary">Inicio</Link> / <span className="text-slate-900">Catálogo</span>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <span className="text-sm font-bold text-slate-900 whitespace-nowrap mr-2">{totalCount} Resultados</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-slate-500 hidden sm:inline">Ordenar por:</span>
                <SortSelector initialSort={params.sort} />
                <button className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-lg text-slate-700">
                    <span className="material-symbols-outlined">filter_list</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((prod: any) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
          {products?.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500">
                No se encontraron productos en esta categoría.
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center">
              <nav className="flex items-center gap-2">
                  {currentPage > 1 && (
                    <Link 
                      href={createPageUrl(currentPage - 1)}
                      className="size-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </Link>
                  )}
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Link 
                      key={pageNum}
                      href={createPageUrl(pageNum)}
                      className={`size-10 flex items-center justify-center rounded-lg font-bold transition-colors ${
                        currentPage === pageNum 
                          ? 'bg-primary text-white' 
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  ))}

                  {currentPage < totalPages && (
                    <Link 
                      href={createPageUrl(currentPage + 1)}
                      className="size-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </Link>
                  )}
              </nav>
          </div>
        )}
      </main>
    </div>
  );
}
