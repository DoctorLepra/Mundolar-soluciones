'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { convertToWebP } from '@/lib/image-utils';

// Interfaces based on original project
interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  slug: string;
  image_url: string | null;
  status: 'Activo' | 'Borrador' | 'Archivado';
  position: number | null;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

export default function AdminCategoriesPage() {
    // DB State
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<number[]>([]);
    
    // Edit Form State
    const [editForm, setEditForm] = useState({
        id: 0, name: '', slug: '', parent_id: 'none', description: '', status: 'Activo' as 'Activo' | 'Borrador' | 'Archivado'
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [editCategoryImage, setEditCategoryImage] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategorySlug, setNewCategorySlug] = useState('');
    const [newCategoryParent, setNewCategoryParent] = useState('none');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryNode | null>(null);

    // Drag and Drop State
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ targetId: number; position: 'top' | 'bottom' } | null>(null);

    const findCategoryInTree = (nodes: CategoryNode[], id: number): CategoryNode | undefined => {
        for (const node of nodes) {
            if (node.id === id) return node;
            const found = findCategoryInTree(node.children, id);
            if (found) return found;
        }
        return undefined;
    };

    const fetchAndStructureCategories = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('categories')
            .select('id, name, parent_id, description, slug, image_url, status, position')
            .order('position', { ascending: true, nullsFirst: false });

        if (fetchError) {
            console.error("Error fetching categories:", fetchError);
            setError(`Error al cargar categorías: ${fetchError.message}`);
            setLoading(false);
            return;
        }
        
        const categoriesData = data as Category[];
        setAllCategories(categoriesData);

        const categoriesMap = new Map<number, CategoryNode>();
        categoriesData.forEach(cat => categoriesMap.set(cat.id, { ...cat, children: [] }));
        
        const tree: CategoryNode[] = [];
        categoriesData.forEach(cat => {
            if (cat.parent_id && categoriesMap.has(cat.parent_id)) {
                categoriesMap.get(cat.parent_id)!.children.push(categoriesMap.get(cat.id)!);
            } else {
                tree.push(categoriesMap.get(cat.id)!);
            }
        });
        
        // Sort children inside each node
        const sortNodes = (nodes: CategoryNode[]) => {
            nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            nodes.forEach(node => {
                if (node.children.length > 0) sortNodes(node.children);
            });
        };
        sortNodes(tree);

        setCategoryTree(tree);
        
        if (!selectedCategory && tree.length > 0) {
            const firstCategory = tree[0];
            setSelectedCategory(firstCategory);
            if(!expandedNodes.length) {
              setExpandedNodes([firstCategory.id]);
            }
        } else if (selectedCategory) {
          const updatedSelected = findCategoryInTree(tree, selectedCategory.id) || null;
          setSelectedCategory(updatedSelected);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchAndStructureCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            setEditForm({
                id: selectedCategory.id,
                name: selectedCategory.name,
                slug: selectedCategory.slug,
                parent_id: selectedCategory.parent_id?.toString() || 'none',
                description: selectedCategory.description || '',
                status: selectedCategory.status as 'Activo' | 'Borrador' | 'Archivado'
            });
            setEditCategoryImage(null);
            setImagePreviewUrl(selectedCategory.image_url);
        }
    }, [selectedCategory]);
    
    useEffect(() => {
        const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setNewCategorySlug(slug);
    }, [newCategoryName]);

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({...prev, [name]: value}));
    };

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEditCategoryImage(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleStatusToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({...prev, status: e.target.checked ? 'Activo' : 'Borrador' }));
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory) return;

        if (editForm.parent_id !== 'none' && parseInt(editForm.parent_id, 10) === selectedCategory.id) {
            return alert("Una categoría no puede ser su propia categoría padre.");
        }

        setIsUpdating(true);
        try {
            const { id, name, parent_id, description, status } = editForm;
            const newSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            let imageUrlToUpdate = selectedCategory.image_url;

            if (editCategoryImage) {
                // Optimization: Convert to WebP
                const webpBlob = await convertToWebP(editCategoryImage);
                // Fixed naming to overwrite existing images
                const fileName = `category-${id}.webp`;
                const newPublicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/categorias/${fileName}`;

                // If the old image has a different name, delete it
                if (selectedCategory.image_url && selectedCategory.image_url !== newPublicUrl) {
                    try {
                        const urlObj = new URL(selectedCategory.image_url);
                        if (urlObj.hostname.includes('r2.dev')) {
                            await fetch('/api/upload/presigned', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ publicUrl: selectedCategory.image_url })
                            });
                        }
                    } catch (e) { console.error("Could not delete old image:", e); }
                }

                const presignedRes = await fetch('/api/upload/presigned', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName,
                        contentType: 'image/webp',
                        folder: 'categorias'
                    })
                });

                if (!presignedRes.ok) throw new Error('Error al obtener URL de subida');
                const { signedUrl, publicUrl } = await presignedRes.json();

                const uploadRes = await fetch(signedUrl, {
                    method: 'PUT',
                    body: webpBlob,
                    headers: { 'Content-Type': 'image/webp' }
                });

                if (!uploadRes.ok) throw new Error('Error al subir la imagen a Cloudflare');
                // Use a timestamp to bypass browser cache
                imageUrlToUpdate = `${publicUrl}?t=${Date.now()}`;
            }

            const { error: updateError } = await supabase
                .from('categories')
                .update({ name, slug: newSlug, parent_id: parent_id === 'none' ? null : parseInt(parent_id, 10), description, status, image_url: imageUrlToUpdate })
                .eq('id', id);

            if (updateError) throw updateError;
            
            await fetchAndStructureCategories();
            alert('Categoría actualizada con éxito.');

        } catch (err: any) {
            console.error('Error updating category:', err);
            alert(`Error al actualizar la categoría: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleDelete = () => {
        if (!selectedCategory) return;
        if (selectedCategory.children && selectedCategory.children.length > 0) {
            return alert("No se puede eliminar una categoría con subcategorías. Reasigne o elimine las subcategorías primero.");
        }
        setCategoryToDelete(selectedCategory);
        setIsDeleteModalOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        setIsUpdating(true);
        try {
            // 1. Attempt to delete from database first
            const { error: deleteError } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
            
            if (deleteError) {
                // Handle foreign key constraint (has products linked)
                const isForeignKeyError = deleteError.code === '23503' || 
                                         deleteError.message?.toLowerCase().includes('foreign key constraint');

                if (isForeignKeyError) {
                    alert("Este elemento no se puede eliminar ya que está enlazado con productos u otros registros.");
                    setIsUpdating(false);
                    return;
                }
                throw deleteError;
            }

            // 2. If deletion successful, clean up image from storage
            if (categoryToDelete.image_url) {
                const urlObj = new URL(categoryToDelete.image_url);
                if (urlObj.hostname.includes('r2.dev')) {
                    await fetch('/api/upload/presigned', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicUrl: categoryToDelete.image_url })
                    });
                } else if (urlObj.hostname.includes('supabase.co')) {
                    const pathParts = urlObj.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    await supabase.storage.from('category_images').remove([fileName]);
                }
            }

            setSelectedCategory(null);
            setIsDeleteModalOpen(false);
            setCategoryToDelete(null);
            await fetchAndStructureCategories();
            alert('Categoría eliminada con éxito y almacenamiento liberado.');
        } catch (err: any) {
            console.error('Error deleting category:', err);
            alert(`Error al eliminar la categoría: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleNode = (nodeId: number) => {
        setExpandedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
    };

    const handleOpenModal = () => {
        setNewCategoryName(''); setNewCategorySlug(''); setNewCategoryParent('none'); setNewCategoryDescription(''); setNewCategoryImage(null); setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || !newCategoryImage) {
            alert('Por favor, completa el nombre y la imagen.');
            return;
        }
        setIsSubmitting(true);

        try {
            // Optimization: Convert to WebP
            const webpBlob = await convertToWebP(newCategoryImage);
            const fileName = `${Date.now()}.webp`;

            const presignedRes = await fetch('/api/upload/presigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName,
                    contentType: 'image/webp',
                    folder: 'categorias'
                })
            });

            if (!presignedRes.ok) throw new Error('Error al obtener URL de subida');
            const { signedUrl, publicUrl } = await presignedRes.json();

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                body: webpBlob,
                headers: { 'Content-Type': 'image/webp' }
            });

            if (!uploadRes.ok) throw new Error('Error al subir la imagen a Cloudflare');

            const newCategoryData = { 
                name: newCategoryName, 
                slug: newCategorySlug, 
                parent_id: newCategoryParent === 'none' ? null : parseInt(newCategoryParent, 10), 
                description: newCategoryDescription, 
                status: 'Borrador' as const, 
                image_url: publicUrl,
                position: allCategories.filter(c => c.parent_id === (newCategoryParent === 'none' ? null : parseInt(newCategoryParent, 10))).length
            };

            const { error: insertError } = await supabase.from('categories').insert([newCategoryData]);
            if (insertError) throw insertError;

            handleCloseModal();
            await fetchAndStructureCategories();
        } catch (err: any) {
            console.error('Error creating category:', err);
            alert(`Error al crear la categoría: ${err.message}`);
        } finally { setIsSubmitting(false); }
    };
    
    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, item: CategoryNode) => {
        e.dataTransfer.setData('text/plain', item.id.toString());
        setDraggedItemId(item.id);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent, targetItem: CategoryNode) => {
        e.preventDefault();
        const draggedItem = allCategories.find(c => c.id === draggedItemId);
        if (!draggedItem || draggedItem.id === targetItem.id || draggedItem.parent_id !== targetItem.parent_id) {
            setDropIndicator(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        setDropIndicator({ targetId: targetItem.id, position });
    };
    
    const handleDrop = async (e: React.DragEvent, dropOnItem: CategoryNode) => {
        e.preventDefault();
        const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const draggedItem = allCategories.find(c => c.id === draggedId);
        if (!draggedItem || !dropIndicator) return;
    
        if (draggedItem.parent_id !== dropOnItem.parent_id) {
            return;
        }
    
        let listToReorder: CategoryNode[];
        if (draggedItem.parent_id === null) {
            listToReorder = [...categoryTree];
        } else {
            const parent = findCategoryInTree(categoryTree, draggedItem.parent_id);
            listToReorder = parent ? [...parent.children] : [];
        }
    
        const draggedIndex = listToReorder.findIndex(item => item.id === draggedId);
        let targetIndex = listToReorder.findIndex(item => item.id === dropOnItem.id);
    
        const [removed] = listToReorder.splice(draggedIndex, 1);
        if (dropIndicator.position === 'bottom') targetIndex++;
        // If targetIndex was after removed item, it shifted
        if (dropIndicator.position === 'bottom' && draggedIndex < targetIndex) {
            // Adjust if needed, but splice handles it
        }

        listToReorder.splice(targetIndex, 0, removed);
    
        // Update DB
        const updates = listToReorder.map((item, index) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            parent_id: item.parent_id,
            description: item.description,
            status: item.status,
            image_url: item.image_url,
            position: index
        }));
    
        const { error: updateError } = await supabase.from('categories').upsert(updates);
        if (updateError) {
            console.error("Failed to update category positions:", updateError.message);
            alert("Error al guardar el nuevo orden.");
        }
        await fetchAndStructureCategories();
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

    const renderCategoryTree = (nodes: CategoryNode[], level: number = 0) => (
        nodes.map(node => (
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
                    onClick={() => setSelectedCategory(node)}
                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer border ${selectedCategory?.id === node.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-slate-50 border-transparent'}`}
                    style={{ paddingLeft: `${(level * 24) + 8}px` }}
                >
                    <span className="material-symbols-outlined text-slate-400 cursor-grab active:cursor-grabbing text-[20px]">drag_indicator</span>
                    
                    {node.children.length > 0 ? (
                        <button 
                            className="text-slate-500 hover:text-slate-800 flex items-center justify-center size-6" 
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
                        >
                            <span className="material-symbols-outlined text-[20px]">{ expandedNodes.includes(node.id) ? 'expand_more' : 'chevron_right' }</span>
                        </button>
                    ) : (
                        <div className="size-6 flex items-center justify-center">
                            {level > 0 && <span className="material-symbols-outlined text-slate-300 text-[18px]">subdirectory_arrow_right</span>}
                        </div>
                    )}
                    
                    <span className={`flex-1 font-medium text-sm transition-colors ${selectedCategory?.id === node.id ? 'text-primary' : 'text-slate-700'}`}>{node.name}</span>
                    
                    <div className={`flex items-center gap-1 transition-opacity ${selectedCategory?.id === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${getStatusColor(node.status)}-100 text-${getStatusColor(node.status)}-700 font-bold uppercase`}>
                            {node.status}
                        </span>
                    </div>
                </div>
                {expandedNodes.includes(node.id) && renderCategoryTree(node.children, level + 1)}
                {dropIndicator?.targetId === node.id && dropIndicator.position === 'bottom' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10 rounded"></div>
                )}
            </div>
        ))
    );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-10">
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Gestión de Categorías</h1>
            <p className="text-slate-500 mt-1 font-display">Organiza la jerarquía de productos para el e-commerce.</p>
          </div>
          <button onClick={handleOpenModal} className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Categoría
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-8 flex flex-col lg:flex-row gap-8">
        {/* Structure Column */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-900 font-display text-sm uppercase tracking-wider">Estructura</h3>
            <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200">{allCategories.length} TOTAL</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading ? (
                <div className="p-10 text-center space-y-3">
                    <div className="size-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto"></div>
                    <p className="text-xs text-slate-400 font-medium font-display">Cargando categorías...</p>
                </div>
            ) : error ? (
                <div className="p-6 text-center bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 font-medium font-display">{error}</p>
                </div>
            ) : allCategories.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                    <span className="material-symbols-outlined text-slate-300 text-4xl">category</span>
                    <p className="text-sm text-slate-500 font-medium font-display">No hay categorías aun</p>
                </div>
            ) : renderCategoryTree(categoryTree)}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span className="text-[11px] font-medium font-display">Arrastra para reordenar dentro del mismo nivel</span>
            </div>
          </div>
        </div>

        {/* Edit Panel Column */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {!selectedCategory && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
                <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
                    <span className="material-symbols-outlined text-5xl">edit_document</span>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 font-display">Editor de Categorías</h3>
                   <p className="text-slate-500 text-sm max-w-xs mx-auto font-display">Selecciona una categoría de la estructura para modificar sus datos o eliminarla.</p>
                </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">Editar Categoría</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">ID: #{selectedCategory?.id}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">Estado:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={editForm.status === 'Activo'} onChange={handleStatusToggle} className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-2 text-xs font-bold text-slate-700 font-display">{editForm.status}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleUpdateSubmit} className="space-y-8 max-w-4xl">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Nombre de la Categoría</label>
                            <input type="text" name="name" value={editForm.name} onChange={handleEditFormChange} className="block w-full rounded-lg border-slate-600 px-4 py-3 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.1)] focus:border-primary focus:ring-primary sm:text-sm font-display font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Slug de URL</label>
                            <div className="flex rounded-lg shadow-sm">
                                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-400 font-mono">/categoria/</span>
                                <input type="text" value={editForm.slug} readOnly className="block w-full flex-1 rounded-none rounded-r-lg border-slate-300 bg-slate-50 text-slate-500 sm:text-sm cursor-not-allowed font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Categoría Padre</label>
                            <select name="parent_id" value={editForm.parent_id} onChange={handleEditFormChange} className="block w-full rounded-lg border-slate-600 px-4 py-3 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.1)] focus:border-primary focus:ring-primary sm:text-sm font-display font-medium">
                                <option value="none">Ninguna (Categoría Raíz)</option>
                                {allCategories.filter(c => c.id !== editForm.id).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Imagen Representativa</label>
                            <div className="group relative aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden hover:border-primary transition-colors">
                                {imagePreviewUrl ? (
                                    <>
                                        <Image src={imagePreviewUrl} alt="Preview" fill className="object-cover" />
                                        <label className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <span className="material-symbols-outlined text-3xl mb-1">photo_camera</span>
                                            <span className="text-xs font-bold font-display">CAMBIAR IMAGEN</span>
                                            <input type="file" className="sr-only" onChange={handleEditImageChange} accept="image/*" />
                                        </label>
                                    </>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center p-6 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">image</span>
                                        <span className="text-xs font-bold text-primary font-display">SUBIR IMAGEN</span>
                                        <p className="text-[10px] text-slate-400 mt-2 font-display">PNG, JPG hasta 2MB</p>
                                        <input type="file" className="sr-only" onChange={handleEditImageChange} accept="image/*" />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Descripción</label>
                    <textarea name="description" value={editForm.description} onChange={handleEditFormChange} rows={4} maxLength={160} className="block w-full rounded-lg border-slate-600 px-4 py-3 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.1)] focus:border-primary focus:ring-primary sm:text-sm font-display leading-relaxed" placeholder="Describe esta categoría para el SEO..." />
                    <div className="flex justify-between mt-2">
                        <p className="text-[10px] text-slate-400 font-bold font-display uppercase">Recomendado para meta-description</p>
                        <p className="text-[10px] font-bold text-slate-500 font-display">{editForm.description.length}/160</p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button onClick={handleDelete} disabled={isUpdating} className="flex items-center gap-2 group px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                   <span className="material-symbols-outlined text-[20px] group-hover:shake">delete</span>
                   <span className="text-sm font-bold font-display">Eliminar</span>
                </button>
                <div className="flex gap-4">
                  <button onClick={() => setSelectedCategory(null)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all font-display">Cerrar</button>
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

      {/* Modals remain similarly styled but integrated into the new layout structure */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 font-display">Crear Nueva Categoría</h2>
              <button onClick={handleCloseModal} className="size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Nombre <span className="text-red-500">*</span></label>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej: Antenas VHF" required className="block w-full rounded-lg border-slate-600 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Categoría Padre</label>
                   <select value={newCategoryParent} onChange={e => setNewCategoryParent(e.target.value)} className="block w-full rounded-lg border-slate-600 px-4 py-3 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary font-display font-medium">
                     <option value="none">Raíz (Ninguna)</option>
                     {allCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                   </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Slug Automático</label>
                    <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-500 truncate">
                        {newCategorySlug || 'esperando nombre...'}
                    </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 font-display">Imagen Destacada <span className="text-red-500">*</span></label>
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {newCategoryImage ? (
                    <>
                        <Image src={URL.createObjectURL(newCategoryImage)} alt="Preview" fill className="object-cover" />
                        <button type="button" onClick={() => setNewCategoryImage(null)} className="absolute top-2 right-2 size-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 shadow-lg hover:bg-white">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center p-8 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">add_photo_alternate</span>
                        <span className="text-xs font-bold text-primary font-display">SELECCIONAR IMAGEN</span>
                        <input type="file" className="sr-only" onChange={e => e.target.files && setNewCategoryImage(e.target.files[0])} accept="image/*" required />
                    </label>
                  )}
                </div>
              </div>
            </form>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all font-display">Cancelar</button>
              <button onClick={handleCreateSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/95 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm font-display disabled:opacity-50">
                {isSubmitting ? 'Creando...' : 'Crear Categoría'}
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
            <h2 className="text-xl font-bold text-slate-900 text-center font-display">¿Eliminar Categoría?</h2>
            <p className="text-slate-500 text-center mt-3 font-display">
              Esta acción eliminará permanentemente la categoría <strong>{categoryToDelete?.name}</strong>. Asegúrate de que no haya productos asociados.
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
