import { supabase } from '@/lib/supabase';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Catálogo' };
import CatalogClient from '@/components/catalog/CatalogClient';

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
      query = query.order('created_at', { ascending: false });
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

  return (
    <CatalogClient 
      products={products || []}
      totalCount={totalCount}
      currentPage={currentPage}
      totalPages={totalPages}
      params={params}
    />
  );
}
