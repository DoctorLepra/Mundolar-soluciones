'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import RoleGuard from '@/components/admin/RoleGuard';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Warehouse {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  total_stock?: number;
  total_value?: number;
}

export default function AdminWarehousesPage() {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminWarehousesPageContent />
    </RoleGuard>
  );
}

function AdminWarehousesPageContent() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    location: '',
    status: 'Activo'
  });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const [{ data: warehousesData, error: warehousesError }, { data: productsData, error: productsError }] = await Promise.all([
        supabase.from('warehouses').select('*').order('name', { ascending: true }),
        supabase.from('products').select('stock_quantity, price_with_iva, warehouse_id, auxiliary_warehouse_id, main_warehouse_stock, auxiliary_warehouse_stock')
      ]);

      if (warehousesError) throw warehousesError;
      if (productsError) throw productsError;

      const processedWarehouses = (warehousesData || []).map(w => {
        // Find products where this warehouse is either primary or auxiliary
        const warehouseProducts = (productsData || []).filter(p => 
          p.warehouse_id === w.id || p.auxiliary_warehouse_id === w.id
        );
        
        let total_stock = 0;
        let total_value = 0;

        warehouseProducts.forEach(p => {
            const isMain = p.warehouse_id === w.id;
            const isAux = p.auxiliary_warehouse_id === w.id;
            
            // Add quantity for this specific warehouse
            const qty = (isMain ? (p.main_warehouse_stock || 0) : 0) + 
                        (isAux ? (p.auxiliary_warehouse_stock || 0) : 0);
            
            total_stock += qty;
            total_value += qty * (p.price_with_iva || 0);
        });

        return { ...w, total_stock, total_value };
      });

      setWarehouses(processedWarehouses);
    } catch (err: any) {
      setError(`Error al cargar bodegas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(w => {
      const search = searchTerm.toLowerCase();
      return (
        w.id.toLowerCase().includes(search) ||
        w.name.toLowerCase().includes(search) ||
        (w.location && w.location.toLowerCase().includes(search)) ||
        (w.description && w.description.toLowerCase().includes(search))
      );
    });
  }, [warehouses, searchTerm]);

  const handleOpenCreateModal = () => {
    setWarehouseToEdit(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      location: '',
      status: 'Activo'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (warehouse: Warehouse) => {
    setWarehouseToEdit(warehouse);
    setFormData({
      id: warehouse.id,
      name: warehouse.name,
      description: warehouse.description || '',
      location: warehouse.location || '',
      status: warehouse.status
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!formData.id || !formData.name || !formData.description || !formData.location) {
      setFormError('Todos los campos marcados con * son obligatorios.');
      setIsSubmitting(false);
      return;
    }

    // Alphanumeric validation (no spaces)
    const isValidId = /^[a-zA-Z0-9]+$/.test(formData.id);
    if (!isValidId) {
        setFormError('El Código de la bodega debe ser alfanumérico y sin espacios (ej: B01, CENTRAL01).');
        setIsSubmitting(false);
        return;
    }

    try {
      if (warehouseToEdit) {
        const { data, error } = await supabase
          .from('warehouses')
          .update({
            name: formData.name,
            description: formData.description,
            location: formData.location,
            status: formData.status
          })
          .eq('id', warehouseToEdit.id)
          .select();

        if (error) throw error;
        setWarehouses(prev => prev.map(w => w.id === warehouseToEdit.id ? data[0] : w));
        alert('Bodega actualizada con éxito.');
      } else {
        const { data, error } = await supabase
          .from('warehouses')
          .insert([formData])
          .select();

        if (error) throw error;
        setWarehouses(prev => [data[0], ...prev]);
        alert('Bodega creada con éxito.');
      }
      handleCloseModal();
    } catch (err: any) {
      setFormError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!warehouseToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseToDelete.id);

      if (error) {
        // If it's a foreign key violation (23503), show the requested message
        if (error.code === '23503') {
          alert('Para eliminar esta bodega, no deben haber productos asociados a ella.');
        } else {
          throw error;
        }
        return;
      }
      
      setWarehouses(prev => prev.filter(w => w.id !== warehouseToDelete.id));
      setIsDeleteModalOpen(false);
      alert('Bodega eliminada con éxito.');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (warehouse: Warehouse) => {
    const newStatus = warehouse.status === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ status: newStatus })
        .eq('id', warehouse.id);

      if (error) throw error;
      setWarehouses(prev => prev.map(w => w.id === warehouse.id ? { ...w, status: newStatus } : w));
    } catch (err: any) {
      alert(`Error al cambiar el estado: ${err.message}`);
    }
  };

  const handleExport = () => {
    if (filteredWarehouses.length === 0) return;
    const exportData = filteredWarehouses.map(w => ({
      ID: w.id,
      Nombre: w.name,
      Ubicación: w.location,
      "Stock Total": w.total_stock || 0,
      "Valor Stock": w.total_value || 0,
      Estado: w.status,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bodegas");
    XLSX.writeFile(wb, "mundolar-bodegas.xlsx");
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">Gestión de Bodegas</h2>
            <p className="text-slate-500 mt-1">Administra los puntos físicos de almacenamiento</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">file_upload</span>
              Exportar
            </button>
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nueva Bodega
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg leading-5 bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
              placeholder="Buscar por ID, nombre, ubicación..."
              type="text"
            />
          </div>
        </div>
      </header>

      <div className="p-8 pt-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Código Bodega</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={7} className="text-center p-8 text-slate-500 font-display">Cargando bodegas...</td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="text-center p-8 text-red-600 bg-red-50 font-display">{error}</td></tr>
                ) : filteredWarehouses.length > 0 ? (
                  filteredWarehouses.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{w.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">{w.name}</span>
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">{w.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{w.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-bold text-slate-700">{w.total_stock || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-mono font-bold text-slate-900">${formatCurrency(w.total_value || 0)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleStatus(w)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${w.status === 'Activo' ? 'bg-primary' : 'bg-slate-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${w.status === 'Activo' ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <span className={`text-xs font-medium ${w.status === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {w.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenEditModal(w)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => openDeleteModal(w)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center p-8 text-slate-500 font-display">No se encontraron bodegas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  {warehouseToEdit ? 'Editar Bodega' : 'Nueva Bodega'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Completa la información del punto de almacenamiento</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Código de Bodega *</label>
                    <input 
                      type="text" 
                      name="id" 
                      value={formData.id} 
                      onChange={handleFormChange}
                      disabled={!!warehouseToEdit}
                      placeholder="Ej: B01"
                      className="block w-full rounded-xl border-slate-200 px-4 py-2.5 text-sm font-mono font-bold focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Estado</label>
                    <div className="flex items-center gap-3 h-[38px] px-1">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'Activo' ? 'Inactivo' : 'Activo' }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${formData.status === 'Activo' ? 'bg-primary' : 'bg-slate-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.status === 'Activo' ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                      <span className={`text-sm font-medium ${formData.status === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formData.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre de Bodega *</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleFormChange}
                    placeholder="Ej: Bodega Central"
                    className="block w-full rounded-xl border-slate-200 px-4 py-2.5 text-sm font-bold focus:ring-primary focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ubicación Física *</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[20px]">location_on</span>
                    <input 
                      type="text" 
                      name="location" 
                      value={formData.location} 
                      onChange={handleFormChange}
                      placeholder="Ej: Carrera 15 # 12-34"
                      className="block w-full pl-10 rounded-xl border-slate-200 px-4 py-2.5 text-sm font-medium focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción *</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Detalles sobre el inventario que almacena..."
                    className="block w-full rounded-xl border-slate-200 px-4 py-2.5 text-sm font-medium focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-50 transition-all text-sm"
                >
                  {isSubmitting ? 'Guardando...' : (warehouseToEdit ? 'Actualizar' : 'Crear Bodega')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in duration-200 text-center">
            <div className="size-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-display">¿Eliminar bodega?</h3>
            <p className="text-slate-500 mt-2 text-sm">Esta acción no se puede deshacer. Se eliminarán los registros de la bodega <span className="font-bold text-slate-700">{warehouseToDelete?.name}</span>.</p>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 disabled:opacity-50 transition-all text-sm"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
