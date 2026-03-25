'use client';

import React, { useState } from 'react';

interface Props {
  specs: string | null;
  description: string | null;
  brandName: string;
  techSpecsUrl?: string | null;
}

const TABS = [
  { id: 'description', label: 'Descripción Detallada' },
  { id: 'specs', label: 'Especificaciones Técnicas' },
];

export default function ProductTabs({ specs, description, brandName, techSpecsUrl }: Props) {
  const [activeTab, setActiveTab] = useState<'specs' | 'description'>('description');

  return (
    <div>
      {/* Tab navigation */}
      <div className="border-b border-slate-200 mb-8 flex items-center gap-8 overflow-x-auto no-scrollbar">
        <nav className="flex gap-8 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'specs' | 'description')}
              className={`pb-4 border-b-2 font-bold text-sm uppercase tracking-wide whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {techSpecsUrl && (
          <a
            href={techSpecsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors pb-4 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            Descargar ficha técnica
          </a>
        )}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main content — 2/3 width */}
        <div className="lg:col-span-2">
          {activeTab === 'specs' && (
            specs ? (
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{specs}</p>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">description</span>
                <p className="text-slate-500 text-sm">No hay especificaciones técnicas disponibles para este producto.</p>
              </div>
            )
          )}

          {activeTab === 'description' && (
            description ? (
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">article</span>
                <p className="text-slate-500 text-sm">No hay descripción disponible para este producto.</p>
              </div>
            )
          )}
        </div>

        {/* Warranty card — 1/3 width, always visible */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-blue-600 icon-fill text-xl">verified</span>
            <h3 className="font-bold text-blue-900 text-base">
              Garantía Oficial {brandName}
            </h3>
          </div>
          <p className="text-sm text-blue-800 leading-relaxed">
            Todos nuestros equipos cuentan con 2 años de garantía por defectos de fabricación. Servicio técnico autorizado en nuestras dependencias.
          </p>
        </div>
      </div>
    </div>
  );
}
