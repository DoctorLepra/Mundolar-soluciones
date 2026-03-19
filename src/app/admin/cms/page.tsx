'use client';

import React, { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import RoleGuard from '@/components/admin/RoleGuard';
import { 
  LayoutDashboard, 
  Settings, 
  Home, 
  Info, 
  PhoneCall, 
  Briefcase,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

// Tabs definition
const TABS = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'servicios', label: 'Servicios', icon: Briefcase },
  { id: 'nosotros', label: 'Nosotros', icon: Info },
  { id: 'contacto', label: 'Contacto', icon: PhoneCall },
];

import InicioEditor from '@/components/admin/cms/InicioEditor';
import ServiciosEditor from '@/components/admin/cms/ServiciosEditor';
import NosotrosEditor from '@/components/admin/cms/NosotrosEditor';
import ContactoEditor from '@/components/admin/cms/ContactoEditor';

export default function CmsPage() {
  usePageTitle('CMS - Mundolar');
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <CmsPageContent />
    </RoleGuard>
  );
}

function CmsPageContent() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 min-h-screen">
      <header className="bg-white border-b border-slate-200 px-8 py-6 relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Gestor de Contenido (CMS)</h2>
            <p className="text-slate-500 text-sm font-medium">Personaliza los textos e imágenes de tu sitio web de forma dinámica.</p>
          </div>
        </div>
      </header>

      <div className="p-8">
        {notification && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-bold flex-1">{notification.message}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm mb-8 w-fit max-w-full overflow-x-auto custom-scrollbar no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CMS Sections Map */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-visible">
             {activeTab === 'inicio' && <InicioEditor />}
             {activeTab === 'servicios' && <ServiciosEditor />}
             {activeTab === 'nosotros' && <NosotrosEditor />}
             {activeTab === 'contacto' && <ContactoEditor />}
        </div>
      </div>
    </main>
  );
}
