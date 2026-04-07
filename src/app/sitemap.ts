import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mundolarsoluciones.vercel.app';

  // Base routes
  const routes = [
    '',
    '/catalogo',
    '/contacto',
    '/nosotros',
    '/servicios',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Fetch all active products
  const { data: products } = await supabase
    .from('products')
    .select('id, updated_at')
    .eq('status', 'Activo');

  const productEntries = (products || []).map((product) => ({
    url: `${baseUrl}/producto/${product.id}`,
    lastModified: new Date(product.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Fetch all active categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('status', 'Activo');

  const categoryEntries = (categories || []).map((category) => ({
    url: `${baseUrl}/catalogo?categoria=${category.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...routes, ...productEntries, ...categoryEntries];
}
