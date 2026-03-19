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
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const mobileSearchRef = React.useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [showResults, setShowResults] = React.useState(false);

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
      const isDesktopClick = searchContainerRef.current?.contains(event.target as Node);
      const isMobileClick = mobileSearchRef.current?.contains(event.target as Node);
      
      if (!isDesktopClick && !isMobileClick) {
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

  // Close search and menu on route change
  React.useEffect(() => {
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
    setShowResults(false);
    setSearchQuery('');
  }, [pathname]);

  if (isAdmin || isAuth) return null;

  return (
    <>
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
            <Link href="/" className="flex items-center">
              <Image src="/img/logo-rojo-negro.png" alt="Mundolar" width={250} height={62} className="h-[62px] w-auto object-contain" priority />
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
                            className="flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none cursor-pointer"
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
                                {product.categories?.name || 'Categoría'}
                              </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                          </Link>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            router.push(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
                            setShowResults(false);
                          }}
                          className="w-full p-3 bg-slate-50 text-xs font-bold text-primary hover:text-primary-dark transition-colors text-center border-t border-slate-50"
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
            <div className="flex items-center gap-1 md:gap-4">
              {/* Mobile Search Toggle */}
              <button 
                className="md:hidden p-3 text-slate-600 hover:text-primary transition-colors"
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              >
                <span className="material-symbols-outlined !text-[30px]">{isMobileSearchOpen ? 'close' : 'search'}</span>
              </button>

              <Link href="/carrito" className="relative flex flex-col items-center gap-1 p-3 text-slate-600 hover:text-primary transition-colors">
                <span className="material-symbols-outlined !text-[30px]">shopping_cart</span>
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full scale-110">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button 
                className="md:hidden p-3 text-slate-600 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(true)}
              >
                <span className="material-symbols-outlined !text-[30px]">menu</span>
              </button>
            </div>
          </div>

          {/* Mobile Search Input (Toggled) */}
          {isMobileSearchOpen && (
            <div ref={mobileSearchRef} className="md:hidden mt-4 animate-in slide-in-from-top-4 duration-300">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary transition-all focus:outline-none" 
                  placeholder="¿Qué equipo buscas hoy?" 
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
                
              {/* Mobile Search Results Overlay (Outside FORM to avoid click interference) */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[100]">
                  <div className="max-h-[400px] overflow-y-auto">
                    {searchResults.map((product) => (
                      <Link
                        key={product.id}
                        href={`/producto/${product.id}`}
                        className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-none w-full text-left active:bg-slate-100 transition-colors"
                      >
                        <div className="size-14 relative rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {(() => {
                            const images = parseImageUrls(product.image_urls);
                            return images.length > 0 ? (
                              <Image src={images[0]} alt={product.name} fill className="object-cover" />
                            ) : null;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-slate-900 truncate">{product.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{product.categories?.name || 'Categoría'}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
                        setShowResults(false);
                      }}
                      className="w-full p-4 bg-slate-50 text-xs font-bold text-primary hover:text-primary-dark transition-colors text-center border-t border-slate-50"
                    >
                      Ver todos los resultados
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-8 mt-4 pt-4 border-t border-slate-100 justify-center">
            <Link href="/" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/' ? 'text-primary' : 'text-slate-700'}`}>Inicio</Link>
            <Link href="/catalogo" className={`text-sm font-medium hover:text-primary transition-colors ${pathname?.startsWith('/catalogo') ? 'text-primary' : 'text-slate-700'}`}>Catalogo</Link>
            <Link href="/servicios" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/servicios' ? 'text-primary' : 'text-slate-700'}`}>Servicios</Link>
            <Link href="/nosotros" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/nosotros' ? 'text-primary' : 'text-slate-700'}`}>Nosotros</Link>
            <Link href="/contacto" className={`text-sm font-medium hover:text-primary transition-colors ${pathname === '/contacto' ? 'text-primary' : 'text-slate-700'}`}>Contacto</Link>
          </nav>
        </div>
      </header>
      
      {/* TRULY Full Screen Mobile Menu - Outside the header to avoid stacking context issues */}
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        pathname={pathname}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearchSubmit={handleSearchSubmit}
        cartCount={cartCount}
      />
    </>
  );
};

const MobileMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  pathname: string | null;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  cartCount: number;
}> = ({ isOpen, onClose, pathname, searchQuery, setSearchQuery, handleSearchSubmit, cartCount }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 md:hidden"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in slide-in-from-right duration-500 md:hidden overflow-hidden">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <Image src="/img/logo-rojo-negro.png" alt="Mundolar" width={160} height={40} className="h-10 w-auto object-contain" />
          <button
            onClick={onClose}
            className="flex items-center justify-center size-12 rounded-full bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          {/* Navigation Section */}
          <nav className="px-4 space-y-1.5 mt-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 pb-2">Menú Principal</p>
            {[
              { href: '/', label: 'Inicio', icon: 'home' },
              { href: '/catalogo', label: 'Catalogo', icon: 'inventory_2', match: (p: string) => p?.startsWith('/catalogo') },
              { href: '/servicios', label: 'Servicios', icon: 'build' },
              { href: '/nosotros', label: 'Nosotros', icon: 'groups' },
              { href: '/contacto', label: 'Contacto', icon: 'mail' },
            ].map((item) => {
              const active = item.match ? item.match(pathname || '') : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 translate-x-1'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`size-10 rounded-lg flex items-center justify-center transition-all ${
                    active ? 'bg-white text-primary' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:shadow-sm'
                  }`}>
                    <span className={`material-symbols-outlined text-[22px] ${active ? 'icon-fill' : ''}`}>{item.icon}</span>
                  </div>
                  <span className="text-base font-bold flex-grow font-display">{item.label}</span>
                  <span className={`material-symbols-outlined text-[18px] opacity-40 transition-transform group-hover:translate-x-1 ${active ? 'text-white' : ''}`}>
                    chevron_right
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Floating Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent pt-10 flex gap-3 z-20">
          <Link
            href="/carrito"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-primary text-white font-black text-base shadow-xl shadow-primary/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            Ver Carrito
            {cartCount > 0 && (
              <span className="bg-white text-primary text-[10px] font-black size-6 flex items-center justify-center rounded-full shadow-inner">
                {cartCount}
              </span>
            )}
          </Link>
          <a
            href="https://api.whatsapp.com/send?phone=573052200300&text=Hola!%20Quisiera%20obtener%20m%C3%A1s%20informaci%C3%B3n."
            target="_blank"
            rel="noopener noreferrer"
            className="size-14 flex items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-xl shadow-green-500/20 active:scale-95 transition-all"
            title="WhatsApp de Soporte"
          >
            <svg viewBox="0 0 24 24" className="size-8 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}


export default Navbar;
