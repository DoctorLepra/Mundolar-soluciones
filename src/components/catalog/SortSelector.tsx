'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SortSelector: React.FC<{ initialSort?: string }> = ({ initialSort }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    router.push(`/catalogo?${params.toString()}`);
  };

  return (
    <div className="relative">
      <select 
        defaultValue={initialSort || 'relevance'} 
        onChange={handleSortChange}
        className="appearance-none bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-40 p-2.5 pr-8 cursor-pointer font-medium"
      >
        <option value="relevance">Relevancia</option>
        <option value="price_asc">Precio: Bajo a Alto</option>
        <option value="price_desc">Precio: Alto a Bajo</option>
        <option value="newest">Más nuevos</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </div>
    </div>
  );
};

export default SortSelector;
