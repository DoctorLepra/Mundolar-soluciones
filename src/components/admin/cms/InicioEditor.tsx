'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import AdminActionFooter from '@/components/admin/AdminActionFooter';
import CMSImageUpload from './CMSImageUpload';

interface ContentItem {
  id?: string;
  page: string;
  section: string;
  key: string;
  content: any;
}

export default function InicioEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroData, setHeroData] = useState({
    badge: 'Nueva Serie Disponible',
    title: 'Comunicación Sin Límites',
    description: 'Descubra lo último en tecnología de radio digital móvil...',
    images: [] as string[]
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/admin/cms?page=inicio');
      const { data } = await res.json();
      
      const heroContent = data.find((c: any) => c.section === 'hero' && c.key === 'main');
      if (heroContent) {
        setHeroData(heroContent.content);
      }
    } catch (error) {
      console.error('Error fetching hero content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'inicio',
          section: 'hero',
          key: 'main',
          content: heroData
        })
      });
      if (!res.ok) throw new Error('Error al guardar');
      // Potential: Trigger Revalidation
    } catch (error) {
      console.error('Error saving hero content:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadComplete = (url: string) => {
    if (heroData.images.length >= 3) {
      alert('Se ha alcanzado el máximo de 3 imágenes.');
      return;
    }
    setHeroData({ ...heroData, images: [...heroData.images, url] });
  };


  const handleRemoveImage = (index: number) => {
    const newImages = [...heroData.images];
    newImages.splice(index, 1);
    setHeroData({ ...heroData, images: newImages });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Sección Hero</h3>
            <p className="text-slate-500 text-xs font-medium">Gestiona el banner principal de la página de inicio.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Badge (Texto pequeño superior)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                  value={heroData.badge}
                  onChange={(e) => setHeroData({ ...heroData, badge: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título Principal</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold"
                  value={heroData.title}
                  onChange={(e) => setHeroData({ ...heroData, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción (Soportado por efecto typing)</label>
              <textarea
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium resize-none"
                value={heroData.description}
                onChange={(e) => setHeroData({ ...heroData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-bold text-slate-800">Imágenes (Max 3)</label>
                  <span className="text-primary font-bold">*</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  <span className="font-bold text-slate-700">Recomendado:</span> 1920 x 1080 px (Relación 16:9) • <span className="font-bold text-slate-700">Mínimo:</span> 1280 x 720 px • <span className="font-bold text-slate-700">Formato:</span> WebP o JPG.
                </p>
              </div>
              <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                {heroData.images.length} / 3
              </div>
            </div>
            
          <div className="flex flex-wrap gap-4">
            {heroData.images.map((img, idx) => (
              <div key={idx} className="relative group w-32 aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <img src={img} alt="Hero preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-50 transition-colors shadow-lg active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {heroData.images.length < 3 && (
              <CMSImageUpload 
                onUploadComplete={(urls) => {
                  const newUrls = Array.isArray(urls) ? urls : [urls];
                  const remainingSpace = 3 - heroData.images.length;
                  const limitedUrls = newUrls.slice(0, remainingSpace);
                  setHeroData({ ...heroData, images: [...heroData.images, ...limitedUrls] });
                }}
                label="Añadir"
                multiple={true}
                icon={<ImagePlus size={24} />}
                buttonClassName="w-32 aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all gap-1 bg-slate-50/50 cursor-pointer overflow-hidden p-0 group hover:shadow-sm"
              />
            )}
          </div>
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
