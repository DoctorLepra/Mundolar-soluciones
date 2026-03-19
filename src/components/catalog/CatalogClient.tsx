'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import SortSelector from './SortSelector';
import ProductCard from './ProductCard';
import Link from 'next/link';

interface CatalogClientProps {
  products: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  params: any;
}

export default function CatalogClient({
  products,
  totalCount,
  currentPage,
  totalPages,
  params
}: CatalogClientProps) {
  const [showFilters, setShowFilters] = useState(false);

  const createPageUrl = (pageNumber: number) => {
    const urlParams = new URLSearchParams(params as any);
    urlParams.set('page', pageNumber.toString());
    return `/catalogo?${urlParams.toString()}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-160px)] overflow-hidden relative">
      {/* Sidebar - Collapsible on Mobile */}
      <div className={`
        fixed lg:relative inset-0 lg:inset-auto z-[100] lg:z-20
        w-full lg:w-72 xl:w-80 h-full bg-white
        transition-transform duration-300 ease-in-out
        ${showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:border-r border-slate-100
      `}>
        {/* Mobile Header for Sidebar */}
        <div className="lg:hidden p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-display font-bold text-lg">Filtros</h3>
          <button onClick={() => setShowFilters(false)} className="p-2 text-slate-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="h-[calc(100vh-64px)] lg:h-full overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <Sidebar />
          
          {/* Mobile Apply Button */}
          <div className="lg:hidden mt-8">
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop for Mobile Sidebar */}
      {showFilters && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* AREA DE PRODUCTOS */}
      <main className="flex-1 h-auto lg:h-full lg:overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-slate-900">Catálogo de Productos</h1>
          <nav className="text-sm text-slate-500 hidden sm:block">
            <Link href="/" className="hover:text-primary">Inicio</Link> / <span className="text-slate-900">Catálogo</span>
          </nav>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{totalCount} Resultados</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-slate-500 hidden sm:inline">Ordenar por:</span>
                <SortSelector initialSort={params.sort} />
                <button 
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-sm hover:border-primary transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                    Filtros
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {products?.map((prod: any) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
          {products?.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
                <p>No se encontraron productos en esta categoría.</p>
                <button 
                  onClick={() => window.location.href = '/catalogo'}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  Ver todo el catálogo
                </button>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center pb-10">
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
