'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Target, Users, TrendingUp, Award } from 'lucide-react';
import AdminActionFooter from '@/components/admin/AdminActionFooter';
import CMSImageUpload from './CMSImageUpload';
import CMSIconPicker from './CMSIconPicker';

interface MilestoneItem {
  id: string;
  year: string;
  title: string;
  description: string;
  icon: string;
}

export default function NosotrosEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroData, setHeroData] = useState({
    title: 'Conectándote en Todo Lugar',
    description: 'Somos expertos en soluciones de radiocomunicación portátil y móvil...',
    image: ''
  });
  const [metrics, setMetrics] = useState([
    { key: 'm1', label: 'Años de Experiencia', value: '15+' },
    { key: 'm2', label: 'Clientes Satisfechos', value: '500+' },
    { key: 'm3', label: 'Proyectos Completados', value: '1.2k' },
    { key: 'm4', label: 'Unidades Instaladas', value: '5k+' },
  ]);
  const [history, setHistory] = useState<MilestoneItem[]>([]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/admin/cms?page=nosotros');
      const { data } = await res.json();
      
      const heroContent = data.find((c: any) => c.section === 'hero' && c.key === 'main');
      if (heroContent) setHeroData(heroContent.content);

      const metricsContent = data.find((c: any) => c.section === 'main' && c.key === 'metrics');
      if (metricsContent) setMetrics(metricsContent.content || []);

      const historyContent = data.find((c: any) => c.section === 'main' && c.key === 'history');
      if (historyContent) setHistory(historyContent.content || []);
    } catch (error) {
      console.error('Error fetching nosotros content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'nosotros', section: 'hero', key: 'main', content: heroData })
      });
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'nosotros', section: 'main', key: 'metrics', content: metrics })
      });
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 'nosotros', section: 'main', key: 'history', content: history })
      });
    } catch (error) {
      console.error('Error saving nosotros:', error);
    } finally {
      setSaving(false);
    }
  };

  const addMilestone = () => {
    setHistory([...history, { id: Date.now().toString(), year: '202X', title: '', description: '', icon: 'star' }]);
  };

  const removeMilestone = (id: string) => {
    setHistory(history.filter(m => m.id !== id));
  };

  const updateMilestone = (id: string, updates: Partial<MilestoneItem>) => {
    setHistory(history.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Hero Section Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Cabecera "Nosotros"</h3>
            <p className="text-slate-500 text-xs font-medium">Gestiona el impacto visual inicial de la página.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar cambios
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Título Principal</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" 
                value={heroData.title}
                onChange={(e) => setHeroData({...heroData, title: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Descripción Hero</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none" 
                value={heroData.description}
                onChange={(e) => setHeroData({...heroData, description: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Imagen de Fondo</label>
               {heroData.image && (
                 <button onClick={() => setHeroData({...heroData, image: ''})} className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                   <Trash2 size={12} /> Eliminar
                 </button>
               )}
            </div>
            
            {heroData.image ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-inner group bg-slate-100">
                <img src={heroData.image} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <CMSImageUpload 
                    onUploadComplete={(url) => setHeroData({...heroData, image: Array.isArray(url) ? url[0] : url})}
                    label="Cambiar Imagen"
                    buttonClassName="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg"
                  />
                </div>
              </div>
            ) : (
              <CMSImageUpload 
                onUploadComplete={(url) => setHeroData({...heroData, image: Array.isArray(url) ? url[0] : url})}
                label="Subir Banner (16:9)"
                buttonClassName="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all gap-2 bg-slate-50/50"
                icon={<Plus size={32} />}
              />
            )}
             <p className="text-[10px] text-slate-400 font-medium tracking-tight">
               <span className="font-bold">Sugerido:</span> 1920x1080px (16:9). Se convertirá a WebP automáticamente.
             </p>
          </div>
        </div>
      </div>

      {/* Metrics Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Métricas y Cifras</h3>
            <p className="text-slate-500 text-xs font-medium">Administra los 4 contadores destacados del sitio.</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <div key={metric.key} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
                 <input 
                   type="text" 
                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-lg font-black text-primary" 
                   value={metric.value} 
                   onChange={(e) => {
                     const newMetrics = [...metrics];
                     newMetrics[idx].value = e.target.value;
                     setMetrics(newMetrics);
                   }}
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etiqueta</label>
                 <input 
                   type="text" 
                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700" 
                   value={metric.label}
                   onChange={(e) => {
                     const newMetrics = [...metrics];
                     newMetrics[idx].label = e.target.value;
                     setMetrics(newMetrics);
                   }}
                 />
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* History/Trayectoria Editor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Nuestra Trayectoria</h3>
            <p className="text-slate-500 text-xs font-medium">Gestiona los hitos de la línea de tiempo.</p>
          </div>
          <button onClick={addMilestone} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
            <Plus size={16} />
            Agregar Hito
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {history.map((m) => (
              <div key={m.id} className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">
                <div className="w-24 shrink-0 flex flex-col items-center gap-2">
                   <CMSIconPicker 
                     currentIcon={m.icon || 'star'}
                     onSelect={(icon) => updateMilestone(m.id, { icon })}
                   />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center leading-tight">Icono</p>
                </div>
                <div className="flex-1 space-y-2">
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Año"
                        className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-black text-primary focus:ring-2 focus:ring-primary/20 outline-none" 
                        value={m.year}
                        onChange={(e) => updateMilestone(m.id, { year: e.target.value })}
                      />
                      <input 
                        type="text" 
                        placeholder="Título del hito"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none" 
                        value={m.title}
                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                      />
                   </div>
                   <textarea 
                     placeholder="Descripción del hito"
                     rows={2}
                     className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-medium resize-none" 
                     value={m.description}
                     onChange={(e) => updateMilestone(m.id, { description: e.target.value })}
                   />
                </div>
                <button onClick={() => removeMilestone(m.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AdminActionFooter>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Guardar cambios
        </button>
      </AdminActionFooter>
    </div>
  );
}
