'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Brand interface matching the updated DB schema (Omnitting slug as requested)
interface Brand {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  status: 'Activo' | 'Borrador' | 'Archivado';
  position: number | null;
}

export default function AdminBrandsPage() {
    // DB State
    const [allBrands, setAllBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Edit Form State
    const [editForm, setEditForm] = useState({
        id: 0, name: '', description: '', status: 'Activo' as 'Activo' | 'Borrador' | 'Archivado'
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editBrandImage, setEditBrandImage] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [newBrandDescription, setNewBrandDescription] = useState('');
    const [newBrandImage, setNewBrandImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

    // Drag and Drop State
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ targetId: number; position: 'top' | 'bottom' } | null>(null);

    const fetchBrands = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('brands')
            .select('id, name, description, image_url, status, position')
            .order('position', { ascending: true, nullsFirst: false });

        if (fetchError) {
            console.error("Error fetching brands:", fetchError);
            setError(`Error al cargar marcas: ${fetchError.message}`);
            setLoading(false);
            return;
        }
        
        const brandsData = data as Brand[];
        setAllBrands(brandsData);
        
        if (!selectedBrand && brandsData.length > 0) {
            setSelectedBrand(brandsData[0]);
        } else if (selectedBrand) {
            const updated = brandsData.find(b => b.id === selectedBrand.id) || null;
            setSelectedBrand(updated);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        if (selectedBrand) {
            setEditForm({
                id: selectedBrand.id,
                name: selectedBrand.name,
                description: selectedBrand.description || '',
                status: selectedBrand.status as 'Activo' | 'Borrador' | 'Archivado'
            });
            setEditBrandImage(null);
            setImagePreviewUrl(selectedBrand.image_url);
        }
    }, [selectedBrand]);
    
    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({...prev, [name]: value}));
    };

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEditBrandImage(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleStatusToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({...prev, status: e.target.checked ? 'Activo' : 'Borrador' }));
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrand) return;

        setIsUpdating(true);
        try {
            const { id, name, description, status } = editForm;

            let imageUrlToUpdate = selectedBrand.image_url;

            if (editBrandImage) {
                const fileExt = editBrandImage.name.split('.').pop();
                const newFileName = `brand-${selectedBrand.id}.${fileExt}`;
                const bucketName = 'brand_images';

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(newFileName, editBrandImage, { cacheControl: '3600', upsert: true });
                
                if (uploadError) throw new Error(`Error al subir el logotipo: ${uploadError.message}`);

                const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(newFileName);
                imageUrlToUpdate = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const { error: updateError } = await supabase
                .from('brands')
                .update({ name, description, status, image_url: imageUrlToUpdate })
                .eq('id', id);

            if (updateError) throw updateError;
            
            await fetchBrands();
            alert('Marca actualizada con éxito.');

        } catch (err: any) {
            console.error('Error updating brand:', err);
            alert(`Error al actualizar la marca: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleDelete = () => {
        if (!selectedBrand) return;
        setBrandToDelete(selectedBrand);
        setIsDeleteModalOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!brandToDelete) return;
        setIsUpdating(true);
        try {
            const { error: deleteError } = await supabase.from('brands').delete().eq('id', brandToDelete.id);
            if (deleteError) throw deleteError;

            setSelectedBrand(null);
            setIsDeleteModalOpen(false);
            setBrandToDelete(null);
            await fetchBrands();
            alert('Marca eliminada con éxito.');
        } catch (err: any) {
            console.error('Error deleting brand:', err);
            alert(`Error al eliminar la marca: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleOpenModal = () => {
        setNewBrandName(''); setNewBrandDescription(''); setNewBrandImage(null); setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) {
            alert('Por favor, completa el nombre.');
            return;
        }
        setIsSubmitting(true);

        try {
            let imageUrl = null;

            if (newBrandImage) {
                const fileExt = newBrandImage.name.split('.').pop();
                const fileName = `brand-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('brand_images').upload(fileName, newBrandImage);

                if (uploadError) throw new Error(`Error al subir el logotipo: ${uploadError.message}`);

                const { data: urlData } = supabase.storage.from('brand_images').getPublicUrl(fileName);
                imageUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
            }

            const newBrandData = { 
                name: newBrandName, 
                description: newBrandDescription,
                status: 'Borrador' as const, 
                image_url: imageUrl,
                position: allBrands.length
            };

            const { error: insertError } = await supabase.from('brands').insert([newBrandData]);
            if (insertError) throw insertError;

            handleCloseModal();
            await fetchBrands();
        } catch (err: any) {
            console.error('Error creating brand:', err);
            alert(`Error al crear la marca: ${err.message}`);
        } finally { setIsSubmitting(false); }
    };
    
    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, item: Brand) => {
        e.dataTransfer.setData('text/plain', item.id.toString());
        setDraggedItemId(item.id);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent, targetItem: Brand) => {
        e.preventDefault();
        const draggedItem = allBrands.find(b => b.id === draggedItemId);
        if (!draggedItem || draggedItem.id === targetItem.id) {
            setDropIndicator(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        setDropIndicator({ targetId: targetItem.id, position });
    };
    
    const handleDrop = async (e: React.DragEvent, dropOnItem: Brand) => {
        e.preventDefault();
        const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const draggedItem = allBrands.find(b => b.id === draggedId);
        if (!draggedItem || !dropIndicator) return;
    
        const listToReorder = [...allBrands];
        const draggedIndex = listToReorder.findIndex(item => item.id === draggedId);
        let targetIndex = listToReorder.findIndex(item => item.id === dropOnItem.id);
    
        const [removed] = listToReorder.splice(draggedIndex, 1);
        if (dropIndicator.position === 'bottom') targetIndex++;

        listToReorder.splice(targetIndex, 0, removed);
    
        // Update DB
        const updates = listToReorder.map((item, index) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            status: item.status,
            image_url: item.image_url,
            position: index
        }));
    
        const { error: updateError } = await supabase.from('brands').upsert(updates);
        if (updateError) {
            console.error("Failed to update brand positions:", updateError.message);
            alert("Error al guardar el nuevo orden.");
        }
        await fetchBrands();
        setDropIndicator(null);
        setDraggedItemId(null);
    };
    
    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50');
        setDraggedItemId(null);
        setDropIndicator(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Activo': return 'emerald';
            case 'Borrador': return 'slate';
            case 'Archivado': return 'red';
            default: return 'slate';
        }
    };

    const filteredBrands = allBrands.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-10">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 font-body">
            <span className="hover:text-primary cursor-pointer">Inicio</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="hover:text-primary cursor-pointer">Catálogo</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 font-medium">Marcas</span>
        </div>
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Gestión de Marcas</h1>
            <p className="text-slate-500 mt-1 font-display">Administra los fabricantes y marcas de productos.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all font-display">
                <span className="material-symbols-outlined text-[20px]">file_upload</span>
                <span>Importar</span>
            </button>
            <button onClick={handleOpenModal} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Crear Marca
            </button>
          </div>
        </div>
        
        <div className="w-full max-w-2xl mt-6">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                </div>
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary shadow-sm font-body" 
                    placeholder="Buscar marca por nombre..." 
                />
            </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-8 pt-4 flex flex-col lg:flex-row gap-8">
        {/* List Column */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-900 font-display text-sm uppercase tracking-wider">Listado de Marcas</h3>
            <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">{allBrands.length} TOTAL</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading ? (
                <div className="p-10 text-center space-y-3">
                    <div className="size-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto"></div>
                    <p className="text-xs text-slate-400 font-medium font-display">Cargando marcas...</p>
                </div>
            ) : error ? (
                <div className="p-6 text-center bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 font-medium font-display">{error}</p>
                </div>
            ) : filteredBrands.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                    <span className="material-symbols-outlined text-slate-300 text-4xl">{searchTerm ? 'search_off' : 'verified'}</span>
                    <p className="text-sm text-slate-500 font-medium font-display">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay marcas aun'}
                    </p>
                </div>
            ) : (
                filteredBrands.map(node => (
                    <div key={node.id} className="relative">
                        {dropIndicator?.targetId === node.id && dropIndicator.position === 'top' && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10 rounded"></div>
                        )}
                        <div
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, node)}
                            onDragOver={(e) => handleDragOver(e, node)}
                            onDrop={(e) => handleDrop(e, node)}
                            onDragEnd={handleDragEnd}
                            onDragLeave={() => setDropIndicator(null)}
                            onClick={() => setSelectedBrand(node)}
                            className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${selectedBrand?.id === node.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-slate-50 border-transparent'}`}
                        >
                            <span className="material-symbols-outlined text-slate-400 cursor-grab active:cursor-grabbing text-[20px]">drag_indicator</span>
                            <span className={`flex-1 font-medium text-sm transition-colors ${selectedBrand?.id === node.id ? 'text-primary' : 'text-slate-700'}`}>{node.name}</span>
                            <div className={`flex items-center gap-1 transition-opacity ${selectedBrand?.id === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${getStatusColor(node.status)}-100 text-${getStatusColor(node.status)}-700 font-bold uppercase`}>
                                    {node.status}
                                </span>
                            </div>
                        </div>
                        {dropIndicator?.targetId === node.id && dropIndicator.position === 'bottom' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10 rounded"></div>
                        )}
                    </div>
                ))
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span className="text-[11px] font-medium font-display">Arrastra para reordenar el listado</span>
            </div>
          </div>
        </div>

        {/* Edit Panel Column */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {!selectedBrand && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
                    <span className="material-symbols-outlined text-5xl">edit_document</span>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 font-display">Editor de Marcas</h3>
                   <p className="text-slate-500 text-sm max-w-xs mx-auto font-display">Selecciona una marca del listado para modificar sus datos o eliminarla.</p>
                </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">Editar Marca</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">ID: #{selectedBrand?.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 font-display">Estado:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={editForm.status === 'Activo'} onChange={handleStatusToggle} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-3 text-sm font-medium text-slate-900 font-display">{editForm.status}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleUpdateSubmit} className="space-y-8 max-w-3xl">
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Nombre de la Marca</label>
                        <input type="text" name="name" value={editForm.name} onChange={handleEditFormChange} className="block w-full rounded-lg border-slate-300 px-4 py-2.5 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm font-display font-medium" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Descripción</label>
                        <textarea name="description" value={editForm.description} onChange={handleEditFormChange} rows={4} className="block w-full rounded-lg border-slate-300 px-4 py-2.5 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm font-display" placeholder="Describe brevemente esta marca para SEO y listados..."></textarea>
                    </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Logotipo / Imagen Destacada</label>
                    <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-primary transition-colors bg-slate-50">
                        <div className="text-center">
                            <div className="mx-auto flex h-20 w-40 items-center justify-center rounded-lg bg-white border border-slate-200 mb-4 overflow-hidden relative shadow-sm">
                                {imagePreviewUrl ? (
                                    <Image src={imagePreviewUrl} alt="Preview" fill className="object-contain p-2" />
                                ) : (
                                    <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                                )}
                            </div>
                            <div className="flex text-sm leading-6 text-slate-600 justify-center">
                                <label className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary-dark focus-within:outline-none">
                                    <span>Subir logotipo</span>
                                    <input type="file" className="sr-only" onChange={handleEditImageChange} accept="image/*" />
                                </label>
                                <p className="pl-1 font-display">o arrastrar y soltar</p>
                            </div>
                            <p className="text-xs leading-5 text-slate-500 font-display">PNG, JPG, SVG hasta 2MB</p>
                        </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button onClick={handleDelete} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-sm font-medium font-display">
                   <span className="material-symbols-outlined text-[18px]">delete</span>
                   Eliminar Marca
                </button>
                <div className="flex gap-4">
                  <button onClick={() => setSelectedBrand(null)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 bg-white text-sm font-bold hover:bg-slate-50 transition-all font-display">Cerrar</button>
                  <button onClick={handleUpdateSubmit} disabled={isUpdating} className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display disabled:opacity-50">
                    <span className="material-symbols-outlined text-[20px]">{isUpdating ? 'sync' : 'save'}</span>
                    <span>{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 font-display">Crear Nueva Marca</h2>
              <button onClick={handleCloseModal} className="size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Nombre <span className="text-red-500">*</span></label>
                <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Ej: Motorola Solutions" required className="block w-full rounded-lg border-slate-300 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Descripción</label>
                <textarea value={newBrandDescription} onChange={e => setNewBrandDescription(e.target.value)} placeholder="Describe brevemente esta marca..." rows={3} className="block w-full rounded-lg border-slate-300 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 font-display">Logotipo</label>
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {newBrandImage ? (
                    <>
                        <Image src={URL.createObjectURL(newBrandImage)} alt="Preview" fill className="object-contain p-4" />
                        <button type="button" onClick={() => setNewBrandImage(null)} className="absolute top-2 right-2 size-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center p-8 text-center w-full">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">add_photo_alternate</span>
                        <span className="text-xs font-bold text-primary font-display">SELECCIONAR LOGOTIPO</span>
                        <input type="file" className="sr-only" onChange={e => e.target.files && setNewBrandImage(e.target.files[0])} accept="image/*" />
                    </label>
                  )}
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all font-display">Cancelar</button>
              <button onClick={handleCreateSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/95 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display disabled:opacity-50">
                {isSubmitting ? 'Creando...' : 'Crear Marca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="size-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center font-display">¿Eliminar Marca?</h2>
            <p className="text-slate-500 text-center mt-3 font-display">
              Esta acción eliminará permanentemente la marca <strong>{brandToDelete?.name}</strong>. Asegúrate de que no haya productos asociados.
            </p>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleConfirmDelete} disabled={isUpdating} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-600/20 transition-all font-display">
                {isUpdating ? 'Eliminando...' : 'Sí, Eliminar Permanentemente'}
              </button>
              <button onClick={() => setIsDeleteModalOpen(false)} className="w-full border border-slate-300 text-slate-600 font-bold py-3 rounded-lg hover:bg-slate-50 transition-all font-display">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
