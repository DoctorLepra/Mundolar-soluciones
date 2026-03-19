'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import RoleGuard from '@/components/admin/RoleGuard';
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Shield, 
  User, 
  Mail, 
  Edit,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import AdminActionFooter from '@/components/admin/AdminActionFooter';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  force_password_change: boolean;
  created_at: string;
  email?: string;
}

export default function UsuariosPage() {
  usePageTitle('Usuarios');
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <UsuariosPageContent />
    </RoleGuard>
  );
}

function UsuariosPageContent() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'Asesor Comercial'
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (profile: Profile) => {
    setFormData({
      full_name: profile.full_name || '',
      email: profile.email || '',
      role: profile.role || 'Asesor Comercial'
    });
    setEditingUserId(profile.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      if (isEditMode && editingUserId) {
        // Update existing user
        const response = await fetch('/api/admin/users/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUserId, full_name: formData.full_name, role: formData.role })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al actualizar usuario');
        setNotification({ type: 'success', message: 'Usuario actualizado correctamente' });
      } else {
        // Invite new user
        const response = await fetch('/api/admin/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error al invitar usuario');
        setNotification({ type: 'success', message: '¡Invitación enviada con éxito!' });
      }

      setIsModalOpen(false);
      resetForm();
      fetchProfiles();
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', role: 'Asesor Comercial' });
    setIsEditMode(false);
    setEditingUserId(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción es irreversible.')) return;

    try {
        const response = await fetch(`/api/admin/users/delete?id=${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Error al eliminar usuario');
        
        setNotification({ type: 'success', message: 'Usuario eliminado correctamente' });
        fetchProfiles();
    } catch (error: any) {
        setNotification({ type: 'error', message: error.message });
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 min-h-screen">
      <header className="bg-white border-b border-slate-200 px-8 py-6 relative z-30 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Gestión de Usuarios</h2>
            <p className="text-slate-500 text-sm font-medium">Administra el acceso y roles de tu equipo.</p>
          </div>
          <div className="hidden lg:flex">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 hover:bg-primary-dark shadow-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo Usuario
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-6">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-display shadow-[0_4px_12px_rgba(0,0,0,0.15)] outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="p-8">

        {notification && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="text-sm font-bold flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Registro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({length: 3}).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                    </tr>
                  ))
                ) : filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 font-display">{profile.full_name || 'Sin nombre'}</p>
                            <p className="text-xs text-slate-500 font-medium">{profile.email || 'No asignado'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold ${
                          profile.role === 'Admin' ? 'bg-amber-50 text-amber-100 border border-amber-200' : 'bg-blue-50 text-blue-100 border border-blue-200'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">{profile.role === 'Admin' ? 'admin_panel_settings' : 'person'}</span>
                          <span className={`${profile.role === 'Admin' ? 'text-amber-700' : 'text-blue-700'}`}>{profile.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${profile.force_password_change ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                          <span className="text-[11px] font-bold text-slate-600">
                            {profile.force_password_change ? 'Pendiente Cambio' : 'Activo'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 text-right">
                          <button 
                            onClick={() => handleEditClick(profile)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(profile.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <User size={40} className="text-slate-300" />
                        <p className="text-slate-500 font-medium">No se encontraron usuarios.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 font-display tracking-tight">
                    {isEditMode ? 'Editar Usuario' : 'Invitar Usuario'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">
                    {isEditMode ? 'Actualiza los datos del perfil.' : 'Se enviará una invitación por correo.'}
                  </p>
                </div>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre Completo <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">person</span>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Juan Pérez"
                      className="block w-full pl-12 pr-4 py-2.5 bg-white border border-slate-600 rounded-lg text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm outline-none"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Correo Electrónico <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                    <input 
                      type="email" 
                      required
                      disabled={isEditMode}
                      placeholder="correo@mundolar.com"
                      className="block w-full pl-12 pr-4 py-2.5 bg-white border border-slate-600 rounded-lg text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Role and Submit */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Rol de Acceso <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Asesor Comercial', 'Admin'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({...formData, role})}
                        className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                          formData.role === role 
                            ? 'bg-primary border-primary text-white shadow-md' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button onClick={() => { setIsModalOpen(false); resetForm(); }} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Invitar Usuario')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <AdminActionFooter>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-white p-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 font-display"
        >
          <UserPlus size={20} />
          <span>Nuevo Usuario</span>
        </button>
      </AdminActionFooter>
    </main>
  );
}
