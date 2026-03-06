'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const isAdmin = pathname?.startsWith('/admin');
  const isAuth = pathname?.startsWith('/login') || pathname?.startsWith('/auth');

  // Helper to parse image URLs safely
  const parseImageUrls = (urls: any): string[] => {
    if (!urls) return [];
    if (Array.isArray(urls)) return urls;
    if (typeof urls === 'string') {
      if (urls.startsWith('http')) return [urls];
      try { return JSON.parse(urls); } catch { return [urls]; }
    }
    return [];
  };

  // Handle click outside to close search results
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic with debounce
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const { data, error } = await supabase
            .from('products')
            .select(`
              id,
              name,
              image_urls,
              categories (name)
            `)
            .ilike('name', `%${searchQuery}%`)
            .eq('status', 'Activo')
            .limit(6);

          if (error) throw error;
          setSearchResults(data || []);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowResults(false);
    }
  };

  if (isAdmin || isAuth) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="bg-primary text-white py-2 px-4 md:px-10 text-xs font-medium flex justify-between items-center">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">call</span> +57 305 2200300</span>
          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">mail</span> comercial@mundolarsoluciones.com</span>
        </div>
        <div className="hidden sm:flex gap-4">
          <a 
            href="https://api.whatsapp.com/send?phone=573052200300&text=Hola!%20Quisiera%20obtener%20m%C3%A1s%20informaci%C3%B3n." 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:underline opacity-90"
          >
            Soporte
          </a>
          <Link href="/admin" className="hover:underline opacity-90">Portal Admin</Link>
        </div>
      </div>
      <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined">leak_add</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Mundolar</h2>
          </Link>
          <div className="hidden md:flex flex-1 max-w-xl px-8" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary transition-all active:border-none focus:outline-none" 
                placeholder="Buscar radios, repuestos o modelos..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              />

              {/* Search Results Dropdown */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
                      <div className="size-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Buscando productos...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          href={`/producto/${product.id}`}
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                        >
                          <div className="size-12 relative rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                            {(() => {
                              const images = parseImageUrls(product.image_urls);
                              return images.length > 0 ? (
                                <Image 
                                  src={images[0]} 
                                  alt={product.name} 
                                  fill 
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <span className="material-symbols-outlined">image</span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{product.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {/* @ts-ignore */}
                              {product.categories?.name || 'Inatrasable'}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                        </Link>
                      ))}
                      <button
                        type="submit"
                        className="w-full p-3 bg-slate-50 text-xs font-bold text-primary hover:text-blue-700 transition-colors text-center"
                      >
                        Ver todos los resultados
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <span className="material-symbols-outlined text-slate-200 text-4xl mb-2">inventory_2</span>
                      <p className="text-sm text-slate-500 font-medium">No encontramos productos para "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/carrito" className="relative flex flex-col items-center gap-1 text-slate-600 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <button className="md:hidden p-2 text-slate-600">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
        <nav className="hidden md:flex gap-8 mt-4 pt-4 border-t border-slate-100 justify-center">
          <Link href="/" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/' ? 'text-primary' : 'text-slate-700'}`}>Inicio</Link>
          <Link href="/catalogo" className={`text-sm font-medium hover:text-primary transition-colors ${pathname?.startsWith('/catalogo') ? 'text-primary' : 'text-slate-700'}`}>Catalogo</Link>
          <Link href="/servicios" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/servicios' ? 'text-primary' : 'text-slate-700'}`}>Servicios</Link>
          <Link href="/nosotros" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/nosotros' ? 'text-primary' : 'text-slate-700'}`}>Nosotros</Link>
          <Link href="/contacto" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/contacto' ? 'text-primary' : 'text-slate-700'}`}>Contacto</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
