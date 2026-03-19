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
                          className="w-full p-3 bg-slate-50 text-xs font-bold text-primary hover:text-primary-dark transition-colors text-center"
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
            <div className="md:hidden mt-4 animate-in slide-in-from-top-4 duration-300">
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
                
                {/* Mobile Search Results Overlay */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-[60]">
                    <div className="max-h-[300px] overflow-y-auto">
                      {searchResults.map((product) => (
                        <Link
                          key={product.id}
                          href={`/producto/${product.id}`}
                          onClick={() => {
                            setIsMobileSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-none w-full text-left active:bg-slate-50"
                        >
                          <div className="size-12 relative rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                            {(() => {
                              const images = parseImageUrls(product.image_urls);
                              return images.length > 0 ? (
                                <Image src={images[0]} alt={product.name} fill className="object-cover" />
                              ) : null;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-slate-900 truncate">{product.name}</h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </form>
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
          >
            <svg viewBox="0 0 24 24" className="size-8 fill-current">
              <path d="M12.031 6.172c-2.32 0-4.518.892-6.193 2.512-3.418 3.291-3.418 8.644 0 11.935.917.882 2.011 1.541 3.204 1.942l-.568 2.378 2.222-1.258a9.423 9.423 0 003.335.592c4.893 0 8.875-3.87 8.875-8.627 0-4.757-3.982-8.627-8.875-8.627zm5.414 12.235c-.23.636-1.542 1.258-2.128 1.334-.587.076-1.121.282-3.818-.813-3.235-1.314-5.323-4.502-5.484-4.71-.161-.208-1.314-1.705-1.314-3.242 0-1.537.822-2.296 1.115-2.597.293-.3.638-.376.85-.376.213 0 .426.002.612.012.193.01.442-.07.69.516.253.595.874 2.062.95 2.212.076.15.127.324.025.516-.102.192-.153.312-.305.485-.152.173-.32.388-.456.521-.153.15-.314.312-.136.611.178.299.79 1.272 1.69 2.049.712.616 1.312.808 1.613.931.301.123.477.102.655-.09.178-.192.762-.857.965-1.15.203-.292.406-.244.685-.145.279.1.1.768 1.776 1.38.254.123.424.192.516.324.092.132.092.766-.138 1.399z"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}


export default Navbar;
