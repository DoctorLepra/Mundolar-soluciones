'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Helper interface for Category from DB
interface CategoryDB {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: number | null;
  position: number;
  status: string;
}

// Interface for UI (Tree structure)
interface Category extends CategoryDB {
  children?: Category[];
  level?: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<CategoryDB[]>([]); // For parent selector
  const [loading, setLoading] = useState(true);
  
  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<Category | null>(null);
  const [dragOverItem, setDragOverItem] = useState<Category | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
      name: '',
      slug: '',
      parent_id: '',
      status: 'Activo'
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('position', { ascending: true });
    
    if (error) {
        console.error('Error fetching categories:', error);
        alert('Error al cargar categorías');
    } else {
        const cats = data as CategoryDB[];
        setFlatCategories(cats);
        setCategories(buildCategoryTree(cats));
    }
    setLoading(false);
  };

  const buildCategoryTree = (cats: CategoryDB[], parentId: number | null = null, level = 0): Category[] => {
    return cats
        .filter(c => c.parent_id === parentId)
        .map(c => ({
            ...c,
            level,
            children: buildCategoryTree(cats, c.id, level + 1)
        }));
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = "move";
    // Create a ghost image if desired, or let browser handle it
  };

  const handleDragOver = (e: React.DragEvent, category: Category) => {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedItem || draggedItem.id === category.id) return;
    
    // Prevent dropping a parent into its own child
    if (isChildOf(category, draggedItem)) return;

    setDragOverItem(category);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetCategory.id) return;
    if (isChildOf(targetCategory, draggedItem)) return;

    // Determine new parent: dropping ON a category makes it the parent
    // NOTE: This basic implementation assumes dropping ON an item nests it.
    // For reordering specifically, we might need more complex logic (above/below).
    // For this migration, let's implement: "Drop ON = make child", "Drop on empty space = root" (handled elsewhere?)
    // Actually, let's try to mimic standard "Reorder" logic implicitly by just appending for now or simple "Make Parent".
    // A robust tree sort is complex. Let's assume standard behavior:
    // If we drop A onto B, A becomes a child of B.

    if(confirm(`¿Mover "${draggedItem.name}" dentro de "${targetCategory.name}"?`)) {
        try {
            const { error } = await supabase
                .from('categories')
                .update({ parent_id: targetCategory.id })
                .eq('id', draggedItem.id);
            
            if (error) throw error;
            fetchCategories(); // Refresh tree
        } catch (err: any) {
            alert(`Error al mover categoría: ${err.message}`);
        }
    }
    handleDragEnd();
  };
  
  // Recursively check if 'possibleChild' is actually a child/grandchild of 'possibleParent'
  const isChildOf = (possibleChild: Category, possibleParent: Category): boolean => {
      if (possibleChild.id === possibleParent.id) return true; // Shouldn't happen in loop but safety
      // We need to look up the tree or check children down. 
      // Easier with flat list: check if possibleChild's ancestry includes possibleParent
      let current = flatCategories.find(c => c.id === possibleChild.id);
      while(current && current.parent_id) {
          if (current.parent_id === possibleParent.id) return true;
          current = flatCategories.find(c => c.id === current!.parent_id);
      }
      return false;
  };

  // --- CRUD ---

  const handleOpenModal = (category?: Category) => {
      setFormError(null);
      if (category) {
          setCategoryToEdit(category);
          setFormData({
              name: category.name,
              slug: category.slug,
              parent_id: category.parent_id ? category.parent_id.toString() : '',
              status: category.status
          });
          setImagePreview(category.image_url);
      } else {
          setCategoryToEdit(null);
          setFormData({ name: '', slug: '', parent_id: '', status: 'Activo' });
          setImagePreview(null);
      }
      setNewImage(null);
      setIsModalOpen(true);
  };

  const generateSlug = (name: string) => {
      return name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setFormData(prev => ({ 
          ...prev, 
          name, 
          slug: generateSlug(name) // Auto-generate slug
      }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setNewImage(file);
          setImagePreview(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setFormError(null);

      try {
        let imageUrl = categoryToEdit?.image_url || null;

        // Upload Image if changed
        if (newImage) {
            const fileName = `cat-${Date.now()}-${Math.random()}.${newImage.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('category_images').upload(fileName, newImage);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('category_images').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const payload = {
            name: formData.name,
            slug: formData.slug,
            parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
            status: formData.status,
            image_url: imageUrl,
            // position: 0 // handled by DB default or ordering logic
        };

        if (categoryToEdit) {
             const { error } = await supabase.from('categories').update(payload).eq('id', categoryToEdit.id);
             if (error) throw error;
        } else {
             const { error } = await supabase.from('categories').insert([payload]);
             if (error) throw error;
        }

        setIsModalOpen(false);
        fetchCategories();

      } catch (err: any) {
          setFormError(err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeleteClick = (category: Category) => {
      // Check for children
      if (category.children && category.children.length > 0) {
          alert("No se puede eliminar una categoría que contiene sub-categorías. Elimine o mueva las sub-categorías primero.");
          return;
      }
      setCategoryToDelete(category);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!categoryToDelete) return;
      try {
          const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
          if (error) throw error;
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
          fetchCategories();
      } catch (err: any) {
          alert(`Error al eliminar: ${err.message}`);
      }
  };

  // Render Logic
  const renderCategoryItem = (category: Category) => {
      const isBeingDragged = draggedItem?.id === category.id;
      const isDragOver = dragOverItem?.id === category.id;

      return (
          <div key={category.id} className="mb-2 transition-all duration-200">
              <div 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDrop={(e) => handleDrop(e, category)}
                  className={`
                    flex items-center gap-4 p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all
                    ${isBeingDragged ? 'opacity-50 border-dashed border-slate-400' : 'border-slate-200'}
                    ${isDragOver ? 'border-primary bg-primary/5 ring-2 ring-primary/20 scale-[1.01]' : ''}
                  `}
                  style={{ marginLeft: `${category.level! * 32}px` }}
              >
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
                      <span className="material-symbols-outlined">drag_indicator</span>
                  </div>

                  {/* Image */}
                  <div className="size-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {category.image_url ? (
                          <Image src={category.image_url} alt={category.name} fill sizes="48px" className="object-cover" />
                      ) : (
                          <span className="material-symbols-outlined text-slate-300">image</span>
                      )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{category.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                          <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">/{category.slug}</code>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {category.status}
                          </span>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                       <button onClick={() => handleOpenModal(category)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">edit</span>
                       </button>
                       <button onClick={() => handleDeleteClick(category)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">delete</span>
                       </button>
                  </div>
              </div>
              
              {/* Children */}
              {category.children && category.children.length > 0 && (
                  <div className="mt-2 relative">
                      {/* Vertical line for hierarchy visual */}
                      <div className="absolute left-[22px] top-0 bottom-4 w-px bg-slate-200" style={{ left: `${(category.level! * 32) + 21}px` }}></div>
                      {category.children.map(renderCategoryItem)}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
        <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <h2 className="text-2xl font-bold text-slate-900">Categorías</h2>
                    <p className="text-slate-500 mt-1">Organiza la estructura de tu catálogo</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Nueva Categoría
                </button>
            </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
             {loading ? (
                 <div className="text-center py-20">
                     <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                     <p className="text-slate-500">Cargando estructura...</p>
                 </div>
             ) : categories.length > 0 ? (
                 <div className="space-y-2">
                     {categories.map(renderCategoryItem)}
                 </div>
             ) : (
                 <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                     <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                         <span className="material-symbols-outlined text-3xl text-slate-400">category</span>
                     </div>
                     <h3 className="text-lg font-bold text-slate-900">No hay categorías</h3>
                     <p className="text-slate-500 mt-1 mb-6">Comienza creando la primera categoría para tu tienda</p>
                     <button onClick={() => handleOpenModal()} className="text-primary font-bold hover:underline">Crear categoría ahora</button>
                 </div>
             )}
        </div>

        {/* Modal Create/Edit */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-900">{categoryToEdit ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200 shadow-sm"><span className="material-symbols-outlined text-sm block">close</span></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                         {formError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{formError}</div>}
                         
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                             <input type="text" value={formData.name} onChange={handleNameChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Ej: Radios Portátiles" />
                         </div>

                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Slug (URL)</label>
                             <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-mono text-sm" />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Categoría Padre</label>
                                 <select value={formData.parent_id} onChange={e => setFormData({...formData, parent_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                                     <option value="">- Ninguna (Raíz) -</option>
                                     {flatCategories.filter(c => c.id !== categoryToEdit?.id).map(c => (
                                         <option key={c.id} value={c.id}>{c.name}</option>
                                     ))}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                                 <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white">
                                     <option value="Activo">Activo</option>
                                     <option value="Inactivo">Inactivo</option>
                                 </select>
                             </div>
                         </div>

                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Imagen Representativa</label>
                            <div className="flex items-center gap-4">
                                <div className="size-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">upload</span>
                                        Subir imagen
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    </label>
                                    <p className="text-xs text-slate-500 mt-2">Recomendado: 400x400px. Máx 2MB.</p>
                                </div>
                            </div>
                         </div>

                         <div className="pt-4 flex justify-end gap-3">
                             <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                             <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                 {isSubmitting ? 'Guardando...' : categoryToEdit ? 'Guardar Cambios' : 'Crear Categoría'}
                             </button>
                         </div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal Delete */}
        {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
                    <div className="size-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">¿Eliminar categoría?</h3>
                    <p className="text-slate-500 text-sm mb-6">Estás a punto de eliminar "<strong>{categoryToDelete?.name}</strong>". Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50">Cancelar</button>
                        <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">Sí, eliminar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
