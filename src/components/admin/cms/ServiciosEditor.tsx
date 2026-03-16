'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Edit, Image as ImageIcon } from 'lucide-react';
import CMSImageUpload from './CMSImageUpload';
import CMSIconPicker from './CMSIconPicker';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export default function ServiciosEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroData, setHeroData] = useState({
    title: 'Nuestros Servicios',
    subtitle: 'Soluciones integrales de telecomunicaciones',
    image: ''
  });
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/admin/cms?page=servicios');
      const { data } = await res.json();
      
      const heroContent = data.find((c: any) => c.section === 'hero' && c.key === 'main');
      if (heroContent) setHeroData(heroContent.content);

      const listContent = data.find((c: any) => c.section === 'services' && c.key === 'list');
      if (listContent) setServices(listContent.content || []);
    } catch (error) {
      console.error('Error fetching services content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'servicios', section: 'hero', key: 'main', content: heroData })
      });
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'servicios', section: 'services', key: 'list', content: services })
      });
    } catch (error) {
      console.error('Error saving services:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = () => {
    const newService: Service = { id: Date.now().toString(), title: '', description: '', icon: 'radio' };
    setServices([...services, newService]);
    setEditingService(newService);
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(services.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Hero Header Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Cabecera de Servicios</h3>
            <p className="text-slate-500 text-xs font-medium">Define el título y subtítulo de la página.</p>
          </div>
          <button onClick={handleSaveAll} disabled={saving} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar cambios
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Título Hero</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" 
                value={heroData.title}
                onChange={(e) => setHeroData({...heroData, title: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Subtítulo Hero</label>
              <textarea 
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none" 
                value={heroData.subtitle}
                onChange={(e) => setHeroData({...heroData, subtitle: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Imagen de Fondo (Banner)</label>
              {heroData.image && (
                <button 
                  onClick={() => setHeroData({...heroData, image: ''})}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              )}
            </div>
            
            {heroData.image ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-inner group bg-slate-100">
                <img src={heroData.image} alt="Hero Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <CMSImageUpload 
                     onUploadComplete={(url) => setHeroData({...heroData, image: Array.isArray(url) ? url[0] : url})}
                     label="Cambiar Imagen"
                     buttonClassName="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-50 transition-all"
                   />
                </div>
              </div>
            ) : (
              <CMSImageUpload 
                onUploadComplete={(url) => setHeroData({...heroData, image: Array.isArray(url) ? url[0] : url})}
                label="Subir Banner (16:9)"
                buttonClassName="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all gap-2 bg-slate-50/50"
                icon={<ImageIcon size={32} />}
              />
            )}
            <p className="text-[10px] text-slate-400 font-medium">
              <span className="font-bold">Sugerido:</span> 1920x1080px (16:9). Se convertirá a WebP automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Services List Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Listado de Servicios</h3>
            <p className="text-slate-500 text-xs font-medium">CRUD dinámico para los servicios ofrecidos.</p>
          </div>
          <button onClick={handleAddService} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {services.map((service) => (
              <div key={service.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/30 space-y-4 group transition-all hover:border-slate-300 shadow-sm">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                         <span className="material-symbols-outlined text-[20px]">{service.icon || 'settings'}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 font-display">{service.title || 'Nuevo Servicio'}</h4>
                   </div>
                   <button onClick={() => handleRemoveService(service.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                   </button>
                </div>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Título del servicio"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    value={service.title}
                    onChange={(e) => updateService(service.id, { title: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <CMSIconPicker 
                      currentIcon={service.icon}
                      onSelect={(icon) => updateService(service.id, { icon })}
                    />
                    <textarea 
                      placeholder="Descripción corta"
                      rows={2}
                      className="w-2/3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                      value={service.description}
                      onChange={(e) => updateService(service.id, { description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
