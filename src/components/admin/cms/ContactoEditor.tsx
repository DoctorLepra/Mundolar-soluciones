'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import AdminActionFooter from '@/components/admin/AdminActionFooter';

export default function ContactoEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contactData, setContactData] = useState({
    title: 'Contáctanos',
    description: 'Estamos listos para potenciar tus comunicaciones. Déjanos un mensaje.'
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/admin/cms?page=contacto');
      const { data } = await res.json();
      
      const mainContent = data.find((c: any) => c.section === 'main' && c.key === 'info');
      if (mainContent) setContactData(mainContent.content);
    } catch (error) {
      console.error('Error fetching contact content:', error);
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
        body: JSON.stringify({ page: 'contacto', section: 'main', key: 'info', content: contactData })
      });
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 font-display">Información de Contacto</h3>
            <p className="text-slate-500 text-xs font-medium">Gestiona los textos de la página de contacto.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar Cambios
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Título de Cabecera</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" 
              value={contactData.title}
              onChange={(e) => setContactData({...contactData, title: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none shadow-inner" 
              value={contactData.description}
              onChange={(e) => setContactData({...contactData, description: e.target.value})}
            />
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
