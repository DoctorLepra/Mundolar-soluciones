'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface Product {
  id: number;
  name: string;
  subtitle: string | null;
  description: string | null;
  sku: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  status: string;
  image_urls: string[] | null;
  category_id: number;
  brand_id: number;
  brands: { name: string } | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

const ITEMS_PER_PAGE = 8;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for product modal (Create/Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Image handling states
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [isOfferActive, setIsOfferActive] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    sku: '',
    price: '', // This will hold the OFFER price
    original_price: '', // This will hold the REGULAR price
    stock_quantity: '',
    offer_start_date: '',
    offer_end_date: '',
  });

  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Activo');

  // State for filter dropdowns visibility
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const [productsPromise, categoriesPromise, brandsPromise] = await Promise.all([
        supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('status', 'Activo'),
        supabase.from('brands').select('id, name'),
      ]);
      if (productsPromise.error) setError(`Error al cargar productos: ${productsPromise.error.message}`); else setProducts(productsPromise.data as Product[]);
      if (categoriesPromise.error) setError(prev => `${prev || ''}, ${categoriesPromise.error.message}`); else setCategories(categoriesPromise.data as Category[]);
      if (brandsPromise.error) setError(prev => `${prev || ''}, ${brandsPromise.error.message}`); else setBrands(brandsPromise.data as Brand[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTermLower === '' || product.name.toLowerCase().includes(searchTermLower) || (product.sku && product.sku.toLowerCase().includes(searchTermLower)) || (product.description && product.description.toLowerCase().includes(searchTermLower));
      const matchesCategory = selectedCategoryFilter === 'all' || product.category_id?.toString() === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'all' || product.status === selectedStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategoryFilter, selectedStatusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setIsOfferActive(false);
    setFormError(null);
    setProductForm({ name: '', description: '', category_id: '', brand_id: '', sku: '', price: '', original_price: '', stock_quantity: '', offer_start_date: '', offer_end_date: '' });
    setNewProductImage(null);
    setImagePreviewUrl(null);
    setIsProductModalOpen(true);
  };
  
  const formatDateTimeLocal = (dateString: string | null) => {
    if (!dateString) return '';
    return dateString.slice(0, 16);
  };

  const parseImageUrls = (urls: any): string[] => {
    if (!urls) return [];
    if (Array.isArray(urls)) return urls;
    if (typeof urls === 'string') {
        try {
            const parsed = JSON.parse(urls);
            return Array.isArray(parsed) ? parsed : [urls];
        } catch (e) {
            return [urls];
        }
    }
    return [];
  };

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setFormError(null);
    const isOffer = !!product.original_price && product.original_price > 0 && product.price < product.original_price;
    setIsOfferActive(isOffer);
    setProductForm({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id.toString(),
        brand_id: product.brand_id.toString(),
        sku: product.sku || '',
        price: isOffer ? product.price.toString() : '', // Offer price
        original_price: isOffer ? product.original_price!.toString() : product.price.toString(), // Regular price
        stock_quantity: product.stock_quantity.toString(),
        offer_start_date: formatDateTimeLocal(product.offer_start_date),
        offer_end_date: formatDateTimeLocal(product.offer_end_date),
    });
    setNewProductImage(null);
    const urls = parseImageUrls(product.image_urls);
    setImagePreviewUrl(urls.length > 0 ? urls[0] : null);
    setIsProductModalOpen(true);
  };

  const handleCloseModal = () => setIsProductModalOpen(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setNewProductImage(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        if (formError) setFormError(null);
    }
  };
  
  const handleRemoveImage = () => {
    setNewProductImage(null);
    setImagePreviewUrl(null);
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productToEdit) await handleUpdateProduct(); else await handleCreateProduct();
  };

  const saveProduct = async (isEditing: boolean) => {
    setIsSubmitting(true);
    setFormError(null);

    const { name, description, category_id, brand_id, sku, price, original_price, stock_quantity, offer_start_date, offer_end_date } = productForm;

    if (!name || !description || !category_id || !brand_id || !sku || !original_price || !stock_quantity) {
      setFormError('Todos los campos marcados con * son obligatorios.');
      setIsSubmitting(false); return;
    }
    if(isOfferActive && (!price || !offer_start_date || !offer_end_date)) {
      setFormError('Si la oferta está activa, el precio de oferta y las fechas de inicio/fin son obligatorios.');
      setIsSubmitting(false); return;
    }
    // Validation: Image required for new products
    if(!isEditing && !newProductImage){
      setFormError('Debe subir una imagen para un nuevo producto.');
      setIsSubmitting(false); return;
    }
    // Validation: Image required when editing if prior image removed
    if (isEditing && !newProductImage && !imagePreviewUrl) {
      setFormError('El producto debe tener una imagen.');
      setIsSubmitting(false); return;
    }

    try {
        const { data: existingSku, error: skuError } = await supabase
            .from('products')
            .select('id')
            .eq('sku', sku)
            .neq('id', isEditing && productToEdit ? productToEdit.id : -1);

        if (skuError) throw skuError;

        if (existingSku && existingSku.length > 0) {
            setFormError(`El SKU "${sku}" ya está siendo utilizado por otro producto.`);
            setIsSubmitting(false);
            return;
        }
    } catch (err: any) {
        console.error("Error validando SKU:", err);
        setFormError(`Error al validar el SKU: ${err.message}`);
        setIsSubmitting(false);
        return;
    }

    const finalPrice = isOfferActive ? parseFloat(price) : parseFloat(original_price);
    const finalOriginalPrice = isOfferActive ? parseFloat(original_price) : null;
    const finalOfferStartDate = isOfferActive ? new Date(offer_start_date).toISOString() : null;
    const finalOfferEndDate = isOfferActive ? new Date(offer_end_date).toISOString() : null;

    let finalImageUrl = imagePreviewUrl; 
    const uploadedFileNames: string[] = [];

    try {
      if (newProductImage) {
        const file = newProductImage;
        const fileName = `product-${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('product_images').upload(fileName, file);
        if (error) throw new Error(`Error subiendo nueva imagen: ${error.message}`);
        uploadedFileNames.push(fileName);
        const { data: urlData } = supabase.storage.from('product_images').getPublicUrl(fileName);
        finalImageUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

        if (isEditing && productToEdit) {
            try {
                const urls = parseImageUrls(productToEdit.image_urls);
                const oldUrl = urls.length > 0 ? urls[0] : null;
                if (oldUrl) {
                    const urlObj = new URL(oldUrl);
                    const pathParts = urlObj.pathname.split('/');
                    const oldFileName = pathParts[pathParts.length - 1];
                    await supabase.storage.from('product_images').remove([oldFileName]);
                }
            } catch (e) { console.error("Error eliminando imagen anterior (no crítico)", e); }
        }
      }

      // Ensure valid array of strings, properly handling Blob URLs
      const finalImageUrlsArray = finalImageUrl && !finalImageUrl.startsWith('blob:') ? [finalImageUrl] : [];

      const productData = { 
          name, 
          description, 
          category_id: parseInt(category_id), 
          brand_id: parseInt(brand_id), 
          sku, 
          price: finalPrice, 
          original_price: finalOriginalPrice, 
          stock_quantity: parseInt(stock_quantity), 
          image_urls: finalImageUrlsArray, 
          status: 'Activo', 
          offer_start_date: finalOfferStartDate, 
          offer_end_date: finalOfferEndDate 
      };
      
      if (isEditing && productToEdit) {
        const { data, error } = await supabase.from('products').update(productData).eq('id', productToEdit.id).select('*, brands(name)');
        if (error) throw error;
        alert('Producto actualizado con éxito.');
        setProducts(prev => prev.map(p => p.id === productToEdit.id ? data[0] as Product : p));
      } else {
        const { data, error } = await supabase.from('products').insert([productData]).select('*, brands(name)');
        if (error) throw error;
        alert('Producto creado con éxito.');
        setProducts(prev => [data[0] as Product, ...prev]);
      }
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      setFormError(`Error al guardar producto: ${err.message}`);
      if(uploadedFileNames.length > 0) await supabase.storage.from('product_images').remove(uploadedFileNames);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = () => saveProduct(false);
  const handleUpdateProduct = () => saveProduct(true);

  const openDeleteModal = (product: Product) => { setProductToDelete(product); setIsDeleteModalOpen(true); };
  const closeDeleteModal = () => { setProductToDelete(null); setIsDeleteModalOpen(false); };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return; setIsDeleting(true);
    try {
      const urls = parseImageUrls(productToDelete.image_urls);
      if (urls.length > 0) {
        // Attempt to cleanup images logic
        const fileNames = urls.map(url => {
            try {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                return pathParts[pathParts.length - 1];
            } catch { return null; }
        }).filter(Boolean) as string[];
        
        if (fileNames.length > 0) await supabase.storage.from('product_images').remove(fileNames);
      }
      const { error: dbError } = await supabase.from('products').delete().eq('id', productToDelete.id);
      if (dbError) throw dbError;
      alert("Producto eliminado con éxito."); 
      setProducts(products.filter(p => p.id !== productToDelete.id)); 
      closeDeleteModal();
    } catch (err: any) { alert(`Error al eliminar el producto: ${err.message}`);
    } finally { setIsDeleting(false); }
  };

  const handleExport = () => {
    if (!filteredProducts.length) { alert("No hay productos para exportar."); return; }
    const exportData = filteredProducts.map(p => ({ ID: p.id, Nombre: p.name, Descripción: p.description || '', SKU: p.sku || 'N/A', Precio: p.price, Stock: p.stock_quantity, Estado: p.status, Categoría: categories.find(c => c.id === p.category_id)?.name || 'N/A', Marca: p.brands?.name || 'N/A' }));
    const ws = XLSX.utils.json_to_sheet(exportData); 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos"); 
    XLSX.writeFile(wb, "mundolar-productos.xlsx");
  };

  const getStatusInfo = (status: string) => { switch (status) { case 'Activo': return { color: 'emerald', label: 'Activo' }; case 'Borrador': return { color: 'slate', label: 'Borrador' }; case 'Archivado': return { color: 'gray', label: 'Archivado' }; default: return { color: 'slate', label: 'Desconocido' }; } };
  const getStockInfo = (stock: number) => { if (stock === 0) return { color: 'red', unit: 'sin stock' }; if (stock > 0 && stock <= 10) return { color: 'amber', unit: 'crítico' }; return { color: 'slate', unit: 'unidades' }; };
  const statuses = ['Activo', 'Borrador', 'Archivado'];
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length);

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-900">Gestión de Productos</h2><p className="text-slate-500 mt-1">Administra tu inventario de radios y repuestos</p></div>
          <div className="flex items-center gap-3"><button onClick={handleExport} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-all text-sm"><span className="material-symbols-outlined text-[20px]">file_upload</span>Exportar</button><button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm"><span className="material-symbols-outlined text-[20px]">add</span>Nuevo Producto</button></div>
        </div>
        <div className="mt-8 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:max-w-md"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="material-symbols-outlined text-slate-400">search</span></div><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-shadow" placeholder="Buscar por nombre, modelo o SKU..." type="text" /></div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative"><button onClick={() => setIsCategoryFilterOpen(prev => !prev)} className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary transition-colors"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría:</span><span className="text-sm font-medium text-slate-900">{selectedCategoryFilter === 'all' ? 'Todas' : categories.find(c => c.id.toString() === selectedCategoryFilter)?.name}</span><span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px]">keyboard_arrow_down</span></button>
              {isCategoryFilterOpen && (<div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="py-1"><a href="#" onClick={e => { e.preventDefault(); setSelectedCategoryFilter('all'); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">Todas</a>{categories.map(cat => <a href="#" key={cat.id} onClick={e => { e.preventDefault(); setSelectedCategoryFilter(cat.id.toString()); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">{cat.name}</a>)}</div></div>)}
            </div>
            <div className="relative"><button onClick={() => setIsStatusFilterOpen(prev => !prev)} className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary transition-colors"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado:</span><span className="text-sm font-medium text-slate-900">{selectedStatusFilter === 'all' ? 'Todos' : selectedStatusFilter}</span><span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px]">keyboard_arrow_down</span></button>
              {isStatusFilterOpen && (<div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="py-1"><a href="#" onClick={e => { e.preventDefault(); setSelectedStatusFilter('all'); setIsStatusFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">Todos</a>{statuses.map(status => <a href="#" key={status} onClick={e => { e.preventDefault(); setSelectedStatusFilter(status); setIsStatusFilterOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">{status}</a>)}</div></div>)}
            </div>
          </div>
        </div>
      </header>
      <div className="p-8 pt-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Precio</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (<tr><td colSpan={7} className="text-center p-8 text-slate-500">Cargando...</td></tr>) : error ? (<tr><td colSpan={7} className="text-center p-8 text-red-600 bg-red-50">{error}</td></tr>) : paginatedProducts.length > 0 ? (paginatedProducts.map((p) => {
                  const statusInfo = getStatusInfo(p.status); const stockInfo = getStockInfo(p.stock_quantity);
                  const isOffer = p.original_price && p.original_price > 0;
                  const urls = parseImageUrls(p.image_urls);
                  const imgUrl = urls.length > 0 ? urls[0] : null;
                  return (<tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200 overflow-hidden relative">
                              {imgUrl ? (
                                <Image src={imgUrl} alt={p.name} fill sizes="48px" className="object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400">photo_camera</span>
                              )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.brands?.name || 'Sin marca'}</p>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-slate-700">{categories.find(c => c.id === p.category_id)?.name || 'Sin categoría'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-mono text-slate-600">{p.sku || 'N/A'}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><div className="flex flex-col items-end"><span className="text-sm font-bold text-slate-900">${Number(p.price).toFixed(2)}</span>{isOffer && <span className="text-xs text-red-500 line-through">${Number(p.original_price).toFixed(2)}</span>}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-center"><div className="flex flex-col items-center"><span className={`text-sm font-medium text-${stockInfo.color}-600`}>{p.stock_quantity}</span><span className={`text-[10px] text-${stockInfo.color}-500/70`}>{stockInfo.unit}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-1.5"><span className={`size-2 rounded-full bg-${statusInfo.color}-500`}></span><span className={`text-sm ${statusInfo.color === 'slate' ? 'text-slate-500' : 'text-slate-700'}`}>{statusInfo.label}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => handleOpenEditModal(p)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button><button onClick={() => openDeleteModal(p)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button></div></td>
                    </tr>);
                })) : (<tr><td colSpan={7} className="text-center p-8 text-slate-500">No se encontraron productos.</td></tr>)
              }
            </tbody>
          </table>
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden"><button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Anterior</button><button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Siguiente</button></div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div><p className="text-sm text-slate-700">Mostrando <span className="font-medium">{filteredProducts.length > 0 ? startItem : 0}</span> a <span className="font-medium">{endItem}</span> de <span className="font-medium">{filteredProducts.length}</span> resultados</p></div>
              <div><nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination"><button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => <button key={page} onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? 'page' : undefined} className={`${currentPage === page ? 'z-10 bg-primary/10 border-primary text-primary' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'} relative inline-flex items-center px-4 py-2 border text-sm font-medium`}>{page}</button>)}<button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button></nav></div>
            </div>
          </div>
        </div>
      </div>
      
      {isProductModalOpen && (<div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"><div className="p-6 border-b border-slate-200 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-900">{productToEdit ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2><button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><span className="material-symbols-outlined">close</span></button></div>
        <form id="product-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-pulse">
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                <span>{formError}</span>
            </div>
          )}

          <div><label className="block text-sm font-medium text-slate-700 mb-2">Nombre <span className="text-red-500">*</span></label><input type="text" name="name" value={productForm.name} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Descripción <span className="text-red-500">*</span></label><textarea name="description" value={productForm.description} onChange={handleFormChange} required rows={4} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"></textarea></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Categoria <span className="text-red-500">*</span></label><select name="category_id" value={productForm.category_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Marca <span className="text-red-500">*</span></label><select name="brand_id" value={productForm.brand_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Sku <span className="text-red-500">*</span></label><input type="text" name="sku" value={productForm.sku} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Stock <span className="text-red-500">*</span></label><input type="number" name="stock_quantity" value={productForm.stock_quantity} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" /></div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Precio Original <span className="text-red-500">*</span></label>
            <input type="number" name="original_price" value={productForm.original_price} onChange={handleFormChange} required placeholder="Ej: 299.00" className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" step="0.01" />
          </div>
          <div className="flex items-center gap-3">
             <input id="is-offer" type="checkbox" checked={isOfferActive} onChange={e => setIsOfferActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"/>
             <label htmlFor="is-offer" className="text-sm font-medium text-slate-700">Oferta</label>
          </div>
          {isOfferActive && (
            <div className="space-y-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Precio de Oferta <span className="text-red-500">*</span></label>
                <input type="number" name="price" value={productForm.price} onChange={handleFormChange} required={isOfferActive} placeholder="Ej: 249.00" className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" step="0.01" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Inicio de Oferta <span className="text-red-500">*</span></label>
                      <input type="datetime-local" name="offer_start_date" value={productForm.offer_start_date} onChange={handleFormChange} required={isOfferActive} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Finalización de Oferta <span className="text-red-500">*</span></label>
                      <input type="datetime-local" name="offer_end_date" value={productForm.offer_end_date} onChange={handleFormChange} required={isOfferActive} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                  </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Imagen Principal <span className="text-red-500">*</span></label>
            <div className="mt-1 flex justify-center items-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-10 hover:border-primary transition-colors bg-slate-50 relative group aspect-video">
                {imagePreviewUrl ? (
                    <>
                        <img src={imagePreviewUrl} alt="Vista previa" className="max-h-full max-w-full object-contain rounded-md" />
                        <label htmlFor="product-file-upload" className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl">sync_alt</span>
                                <p className="font-bold mt-1">Cambiar imagen</p>
                            </div>
                            <input id="product-file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                        </label>
                        <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1 bg-white rounded-full text-slate-500 hover:text-red-500 shadow-md z-20">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </>
                ) : (
                    <div className="text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-400">image</span>
                        <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                            <label htmlFor="product-file-upload" className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary-dark">
                                <span>Subir un archivo</span>
                                <input id="product-file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                            </label>
                            <p className="pl-1">o arrástralo aquí</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF hasta 2MB</p>
                    </div>
                )}
            </div>
          </div>
        </form>
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={handleCloseModal} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button>
<button form="product-form" disabled={isSubmitting} type="submit" className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed transition-all">{isSubmitting ? (productToEdit ? 'Guardando...' : 'Creando...') : (productToEdit ? 'Guardar Cambios' : 'Crear Producto')}</button></div>
      </div></div>)}

      {isDeleteModalOpen && productToDelete && (<div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"><div className="p-6 flex items-start gap-4"><div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-3xl">warning</span></div><div><h2 className="text-xl font-bold text-slate-900">Eliminar Producto</h2><p className="text-slate-600 mt-2">¿Estás seguro de que quieres eliminar "<strong>{productToDelete.name}</strong>"? Esta acción es irreversible.</p></div></div><div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={closeDeleteModal} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button><button onClick={handleConfirmDelete} disabled={isDeleting} type="button" className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md disabled:bg-red-600/50 disabled:cursor-not-allowed transition-all">{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</button></div></div></div>)}
    </>
  );
}
