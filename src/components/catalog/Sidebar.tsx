'use client';

import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-full lg:w-64 xl:w-72 shrink-0 hidden lg:block">
      <div className="sticky top-28 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-slate-900">Filtros</h3>
          <button className="text-xs font-medium text-primary hover:underline">Limpiar todo</button>
        </div>
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">Categorías</h4>
          <div className="space-y-3">
            {['Radios Portátiles', 'Radios Móviles', 'Repuestos & Baterías', 'Servicio Técnico'].map((cat, idx) => (
              <label key={idx} className="flex items-center gap-3 group cursor-pointer">
                <input defaultChecked={idx === 0} className="rounded border-slate-300 text-primary focus:ring-primary size-4 cursor-pointer" type="checkbox"/>
                <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">{cat}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="h-px bg-slate-200"></div>
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">Marcas</h4>
          <div className="space-y-3">
            {['Motorola Solutions', 'Hytera', 'Kenwood', 'Icom'].map((brand, idx) => (
              <label key={idx} className="flex items-center gap-3 group cursor-pointer">
                <input defaultChecked={idx === 0} className="rounded border-slate-300 text-primary focus:ring-primary size-4 cursor-pointer" type="checkbox"/>
                <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">{brand}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="h-px bg-slate-200"></div>
        <div className="space-y-4">
          <h4 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">Precio</h4>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 text-xs font-bold">$</span>
              <input className="w-full pl-5 pr-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:ring-primary focus:border-primary" placeholder="Min" type="number"/>
            </div>
            <span className="text-slate-400">-</span>
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 text-xs font-bold">$</span>
              <input className="w-full pl-5 pr-2 py-1.5 text-sm border border-slate-200 rounded bg-white focus:ring-primary focus:border-primary" placeholder="Max" type="number"/>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">support_agent</span>
          </div>
          <h5 className="font-display font-bold text-lg mb-2 relative z-10">¿Necesitas ayuda?</h5>
          <p className="text-xs text-slate-300 mb-4 relative z-10 leading-relaxed">Nuestros ingenieros pueden asesorarte.</p>
          <button className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-bold transition-colors relative z-10 border border-white/20">
            Contactar Soporte
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
