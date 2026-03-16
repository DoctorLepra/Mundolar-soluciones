'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

// Curated list of material symbols appropriate for the telecom/service project
const COMMON_ICONS = [
  'radio', 'settings', 'support_agent', 'power_settings_new', 'wifi', 'lan', 
  'security', 'visibility', 'build', 'engineering', 'construction', 
  'local_shipping', 'inventory', 'analytics', 'groups', 'handshake', 
  'assignment', 'memory', 'router', 'phonelink', 'headset_mic', 
  'location_on', 'event', 'history', 'star', 'military_tech', 
  'verified', 'workspace_premium', 'storefront', 'map', 'public', 
  'build_circle', 'flag', 'domain', 'battery_charging_full', 'hub',
  'terminal', 'sensors', 'antenna', 'satellite_alt', 'call', 'chat',
  'mail', 'info', 'help', 'search', 'home', 'dashboard'
];

interface CMSIconPickerProps {
  currentIcon: string;
  onSelect: (icon: string) => void;
}

export default function CMSIconPicker({ currentIcon, onSelect }: CMSIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = COMMON_ICONS.filter(icon => 
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-all min-w-[120px]"
      >
        <div className="size-6 bg-primary/10 rounded flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[18px]">{currentIcon || 'settings'}</span>
        </div>
        <span className="truncate">{currentIcon || 'Seleccionar...'}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar icono..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto grid grid-cols-4 gap-1 custom-scrollbar">
              {filteredIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    onSelect(icon);
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    currentIcon === icon 
                      ? 'bg-primary/5 border-primary/20 text-primary shadow-sm' 
                      : 'border-transparent text-slate-500 hover:bg-slate-50'
                  }`}
                  title={icon}
                >
                  <span className="material-symbols-outlined text-[24px]">{icon}</span>
                  <span className="text-[8px] mt-1 truncate w-full text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {icon}
                  </span>
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <div className="col-span-4 py-8 text-center text-slate-400 text-xs italic">
                  No se encontraron iconos
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
