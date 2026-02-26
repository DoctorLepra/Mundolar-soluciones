'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
  subcategories?: { id: number; name: string }[];
}

interface Brand {
  id: number;
  name: string;
}

const Sidebar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse current filters from URL
  const selectedCategories = searchParams.get('categoria')?.split(',').filter(Boolean) || [];
  const selectedBrands = searchParams.get('marca')?.split(',').filter(Boolean) || [];
  const isOferta = searchParams.get('oferta') === 'true';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch Brands
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name')
        .eq('status', 'Activo')
        .order('name');
      
      if (brandsData) setBrands(brandsData);

      // Fetch Categories and Subcategories
      const { data: catsData } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('status', 'Activo')
        .order('position');

      if (catsData) {
        const parents = catsData.filter(c => !c.parent_id);
        const structured = parents.map(p => ({
          ...p,
          subcategories: catsData.filter(c => c.parent_id === p.id)
        }));
        setCategories(structured);
      }
      
      setLoading(false);
    }
    fetchData();
  }, []);

  const updateFilters = (key: string, value: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    let currentValues = params.get(key)?.split(',').filter(Boolean) || [];

    if (checked) {
      if (!currentValues.includes(value)) currentValues.push(value);
    } else {
      currentValues = currentValues.filter(v => v !== value);
    }

    if (currentValues.length > 0) {
      params.set(key, currentValues.join(','));
    } else {
      params.delete(key);
    }
    
    router.push(`/catalogo?${params.toString()}`);
  };

  const handleOfertaChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('oferta', 'true');
    } else {
      params.delete('oferta');
    }
    router.push(`/catalogo?${params.toString()}`);
  };

  const clearAll = () => {
    router.push('/catalogo');
  };

  const handleSupport = () => {
    window.open("https://api.whatsapp.com/send?phone=573052200300&text=Hola!%20Necesito%20asesor%C3%ADa%20técnica%20sobre%20un%20producto%20del%20cat%C3%A1logo.", "_blank");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-slate-900">Filtros</h3>
        <button 
          onClick={clearAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          Limpiar todo
        </button>
      </div>

        {/* Ver Todo */}
        <div className="space-y-4">
          <button 
            onClick={clearAll}
            className={`w-full py-2 px-4 rounded-lg text-sm font-bold border transition-all ${
              selectedCategories.length === 0 && selectedBrands.length === 0 && !isOferta
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                : 'bg-white text-slate-700 border-slate-200 hover:border-primary/50'
            }`}
          >
            Ver todos los productos
          </button>
        </div>

        {/* Ofertas */}
        <div className="space-y-4">
            <label className="flex items-center gap-3 group cursor-pointer bg-red-50 p-3 rounded-lg border border-red-100">
              <input 
                type="checkbox" 
                checked={isOferta}
                onChange={(e) => handleOfertaChange(e.target.checked)}
                className="rounded border-red-300 text-red-600 focus:ring-red-500 size-4 cursor-pointer" 
              />
              <span className="text-sm font-bold text-red-700 group-hover:text-red-800 transition-colors">En Oferta</span>
            </label>
        </div>

        <div className="h-px bg-slate-200"></div>

        {/* Categorías */}
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">Categorías</h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <label className="flex items-center gap-3 group cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id.toString())}
                    onChange={(e) => updateFilters('categoria', cat.id.toString(), e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary size-4 cursor-pointer" 
                  />
                  <span className={`text-sm transition-colors ${selectedCategories.includes(cat.id.toString()) ? 'font-bold text-slate-900' : 'text-slate-600 group-hover:text-primary'}`}>
                    {cat.name}
                  </span>
                </label>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="ml-7 space-y-2">
                    {cat.subcategories.map(sub => (
                      <label key={sub.id} className="flex items-center gap-3 group cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedCategories.includes(sub.id.toString())}
                          onChange={(e) => updateFilters('categoria', sub.id.toString(), e.target.checked)}
                          className="rounded border-slate-300 text-primary focus:ring-primary size-3.5 cursor-pointer" 
                        />
                        <span className={`text-xs transition-colors ${selectedCategories.includes(sub.id.toString()) ? 'font-bold text-slate-900' : 'text-slate-600 group-hover:text-primary'}`}>
                          {sub.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200"></div>

        {/* Marcas */}
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">Marcas</h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {brands.map((brand) => (
              <label key={brand.id} className="flex items-center gap-3 group cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id.toString())}
                  onChange={(e) => updateFilters('marca', brand.id.toString(), e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary size-4 cursor-pointer" 
                />
                <span className={`text-sm transition-colors ${selectedBrands.includes(brand.id.toString()) ? 'font-bold text-slate-900' : 'text-slate-600 group-hover:text-primary'}`}>
                  {brand.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200"></div>

        {/* Soporte */}
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">support_agent</span>
          </div>
          <h5 className="font-display font-bold text-lg mb-2 relative z-10">¿Necesitas ayuda?</h5>
          <p className="text-xs text-slate-300 mb-4 relative z-10 leading-relaxed">Nuestros ingenieros pueden asesorarte.</p>
          <button 
            onClick={handleSupport}
            className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-bold transition-colors relative z-10 border border-white/20"
          >
            Contactar Soporte
          </button>
        </div>
      </div>
  );
};

export default Sidebar;
