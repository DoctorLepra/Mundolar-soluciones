'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Product {
  id: number;
  name: string;
  subtitle: string | null;
  description: string | null;
  sku: string | null;
  price: number;
  original_price: number | null;
  price_usd: number | null;
  price_with_iva: number | null;
  specs: string | null;
  stock_quantity: number;
  status: string;
  image_urls: string[] | null;
  category_id: number;
  brand_id: number;
  brands: { name: string } | null;
  offer_start_date: string | null;
  offer_end_date: string | null;
  last_trm_sync: string | null;
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

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
  
  // Image handling states - Supporting up to 5 images
  const [imagePreviewUrls, setImagePreviewUrls] = useState<{ id: string, url: string, file?: File, isExisting?: boolean }[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  
  const [isOfferActive, setIsOfferActive] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    brand_id: '',
    sku: '',
    price: '', // This will hold the OFFER price
    original_price: '', // This will hold the REGULAR price
    price_usd: '',
    price_with_iva: '',
    specs: '',
    stock_quantity: '',
    offer_start_date: '',
    offer_end_date: '',
    status: 'Activo', // Default status
  });

  const [trm, setTrm] = useState<number | null>(null);
  const [loadingTrm, setLoadingTrm] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState<any[]>([]);
  const [processedBulkData, setProcessedBulkData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [isConfirmingImportErrors, setIsConfirmingImportErrors] = useState(false);
  const [isCargaMasivaDropdownOpen, setIsCargaMasivaDropdownOpen] = useState(false);
  const cargaMasivaRef = useRef<HTMLDivElement>(null);

  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // Change default to all

  // State for filter dropdowns visibility
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // State for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerPage(8); // Desktop
      } else {
        setItemsPerPage(5); // Mobile and Tablet
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusFilterOpen(false);
      }
      if (cargaMasivaRef.current && !cargaMasivaRef.current.contains(event.target as Node)) {
        setIsCargaMasivaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const [productsPromise, categoriesPromise, brandsPromise] = await Promise.all([
        supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('status', 'Activo'),
        supabase.from('brands').select('id, name'),
      ]);
      if (productsPromise.error) setError(`Error al cargar productos: ${productsPromise.error.message}`); 
      else {
        const productsData = productsPromise.data as Product[];
        setProducts(productsData);
        // Trigger TRM sync if needed
        await handleSyncTRM(productsData);
      }
      if (categoriesPromise.error) setError(prev => `${prev || ''}, ${categoriesPromise.error.message}`); else setCategories(categoriesPromise.data as Category[]);
      if (brandsPromise.error) setError(prev => `${prev || ''}, ${brandsPromise.error.message}`); else setBrands(brandsPromise.data as Brand[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchTRM = async () => {
    setLoadingTrm(true);
    try {
      // Socrata API - Tasa Representativa del Mercado (Historico)
      const response = await fetch('https://www.datos.gov.co/resource/m97v-7y6z.json?$limit=1&$order=vigenciadesde DESC');
      const data = await response.json();
      if (data && data.length > 0 && data[0].valor) {
        const val = parseFloat(data[0].valor);
        setTrm(val);
        return val;
      }
      return null;
    } catch (err) {
      console.error("Error fetching TRM from Socrata:", err);
      return null;
    } finally {
      setLoadingTrm(false);
    }
  };

  const handleSyncTRM = async (currentProducts: Product[]) => {
    const today = new Date().toISOString().split('T')[0];
    const productsToSync = currentProducts.filter(p => 
      p.price_usd && p.price_usd > 0 && (!p.last_trm_sync || p.last_trm_sync.split('T')[0] !== today)
    );

    if (productsToSync.length === 0) return;

    const currentTrm = await fetchTRM();
    if (!currentTrm) return;

    console.log(`Sincronizando ${productsToSync.length} productos con TRM: ${currentTrm}`);

    const updates = productsToSync.map(p => ({
      id: p.id,
      original_price: Math.round(p.price_usd! * currentTrm),
      price: Math.round(p.price_usd! * currentTrm), // Assuming price is same as original if no offer, but we need to check offer logic
      last_trm_sync: new Date().toISOString()
    }));

    // Perform updates in batch (Supabase doesn't support bulk update with different values easily in a single call without RPC, 
    // but we can do it one by one or via a loop for now or a custom RPC)
    // For simplicity and to avoid too many RPCs, we'll do them one by one or in a Promise.all
    try {
      await Promise.all(updates.map(u => 
        supabase.from('products').update({ 
          original_price: u.original_price,
          price: u.price, // Note: This might overwrite active offers if not careful. 
          last_trm_sync: u.last_trm_sync 
        }).eq('id', u.id)
      ));
      
      // Refresh products list after sync
      const { data: refreshedProducts } = await supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false });
      if (refreshedProducts) setProducts(refreshedProducts as Product[]);
    } catch (err) {
      console.error("Error syncing TRM prices:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchTermLower = searchTerm.toLowerCase();
      const productCategory = categories.find(c => c.id === product.category_id)?.name.toLowerCase() || '';
      const productBrand = product.brands?.name.toLowerCase() || '';
      const productStatus = product.status === 'Archivado' ? 'inactivo' : product.status.toLowerCase();
      
      const matchesSearch = searchTermLower === '' || 
        product.name.toLowerCase().includes(searchTermLower) || 
        (product.sku && product.sku.toLowerCase().includes(searchTermLower)) || 
        (product.description && product.description.toLowerCase().includes(searchTermLower)) ||
        productBrand.includes(searchTermLower) ||
        productCategory.includes(searchTermLower) ||
        product.price.toString().includes(searchTermLower) ||
        product.stock_quantity.toString().includes(searchTermLower) ||
        productStatus.includes(searchTermLower);

      const matchesCategory = selectedCategoryFilter === 'all' || product.category_id?.toString() === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'all' || 
        (selectedStatusFilter === 'Inactivo' ? product.status === 'Archivado' : product.status === selectedStatusFilter);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategoryFilter, selectedStatusFilter, categories]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setIsOfferActive(false);
    setFormError(null);
    setProductForm({ 
      name: '', 
      description: '', 
      category_id: '', 
      brand_id: '', 
      sku: '', 
      price: '', 
      original_price: '', 
      price_usd: '',
      price_with_iva: '',
      specs: '',
      stock_quantity: '', 
      offer_start_date: '', 
      offer_end_date: '', 
      status: 'Activo' 
    });
    setImagePreviewUrls([]);
    setImagesToDelete([]);
    setIsProductModalOpen(true);
    fetchTRM(); // Also fetch TRM when opening create modal
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
    const isOffer = !!product.original_price && product.original_price > 0 && Number(product.price) < Number(product.original_price);
    setIsOfferActive(isOffer);
    setProductForm({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        sku: product.sku || '',
        price: isOffer ? product.price.toString() : '',
        original_price: isOffer ? product.original_price!.toString() : product.price.toString(),
        price_usd: product.price_usd?.toString() || '',
        price_with_iva: product.price_with_iva?.toString() || '',
        specs: product.specs || '',
        stock_quantity: product.stock_quantity.toString(),
        offer_start_date: formatDateTimeLocal(product.offer_start_date),
        offer_end_date: formatDateTimeLocal(product.offer_end_date),
        status: product.status === 'Archivado' ? 'Inactivo' : (product.status || 'Activo'),
    });
    
    const urls = parseImageUrls(product.image_urls);
    setImagePreviewUrls(urls.map(url => ({ id: Math.random().toString(36).substr(2, 9), url, isExisting: true })));
    setImagesToDelete([]);
    setIsProductModalOpen(true);
  };

  const handleCloseModal = () => setIsProductModalOpen(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        const currentCount = imagePreviewUrls.length;
        const remaining = 5 - currentCount;
        
        if (remaining <= 0) {
            alert('Solo puedes subir un máximo de 5 imágenes.');
            return;
        }

        const newFiles = files.slice(0, remaining);
        const newPreviews = newFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file),
            file,
            isExisting: false
        }));

        setImagePreviewUrls(prev => [...prev, ...newPreviews]);
        if (formError) setFormError(null);
    }
  };
  
  const handleRemoveImage = (previewId: string) => {
    const previewToRemove = imagePreviewUrls.find(p => p.id === previewId);
    if (previewToRemove?.isExisting) {
        setImagesToDelete(prev => [...prev, previewToRemove.url]);
    }
    setImagePreviewUrls(prev => prev.filter(p => p.id !== previewId));
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productToEdit) await handleUpdateProduct(); else await handleCreateProduct();
  };

  const saveProduct = async (isEditing: boolean) => {
    setIsSubmitting(true);
    setFormError(null);

    const { name, description, category_id, brand_id, sku, price, original_price, stock_quantity, offer_start_date, offer_end_date, status, price_usd, price_with_iva, specs } = productForm;

    if (!name || !description || !category_id || !brand_id || !sku || !original_price || !stock_quantity) {
      setFormError('Todos los campos marcados con * son obligatorios.');
      setIsSubmitting(false); return;
    }
    if(isOfferActive && (!price || !offer_start_date || !offer_end_date)) {
      setFormError('Si la oferta está activa, el precio de oferta y las fechas de inicio/fin son obligatorios.');
      setIsSubmitting(false); return;
    }

    // Validation: At least one image required
    if (imagePreviewUrls.length === 0) {
      setFormError('Debe subir al menos una imagen para el producto.');
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

    const uploadedFileNames: string[] = [];

    try {
      // 1. Upload new images
      const finalUrls: string[] = [];
      for (const preview of imagePreviewUrls) {
        if (preview.isExisting) {
          finalUrls.push(preview.url);
        } else if (preview.file) {
          const file = preview.file;
          const fileName = `product-${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
          const { error } = await supabase.storage.from('product_images').upload(fileName, file);
          if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
          
          uploadedFileNames.push(fileName);
          const { data: urlData } = supabase.storage.from('product_images').getPublicUrl(fileName);
          finalUrls.push(`${urlData.publicUrl}?t=${new Date().getTime()}`);
        }
      }

      // 2. Delete removed images from storage
      if (imagesToDelete.length > 0) {
        const filesToRemove = imagesToDelete.map(url => {
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            return pathParts[pathParts.length - 1];
          } catch { return null; }
        }).filter(Boolean) as string[];

        if (filesToRemove.length > 0) {
          await supabase.storage.from('product_images').remove(filesToRemove);
        }
      }

    const dbStatus = status === 'Inactivo' ? 'Archivado' : status;

    const productData = { 
          name, 
          description, 
          category_id: parseInt(category_id), 
          brand_id: parseInt(brand_id), 
          sku, 
          price: finalPrice, 
          original_price: finalOriginalPrice, 
          price_usd: price_usd ? parseFloat(price_usd) : null,
          price_with_iva: price_with_iva ? parseFloat(price_with_iva) : null,
          specs: specs || null,
          stock_quantity: parseInt(stock_quantity), 
          image_urls: finalUrls, 
          status: dbStatus, 
          offer_start_date: finalOfferStartDate, 
          offer_end_date: finalOfferEndDate,
          last_trm_sync: price_usd ? new Date().toISOString() : null
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
      console.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setFormError(`Error al guardar producto: ${err.message || 'Error desconocido'}`);
      // Rollback newly uploaded files if DB save fails
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

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      if (data.length === 0) {
        alert("El archivo está vacío.");
        return;
      }

      setBulkImportData(data);
      await processBulkImport(data);
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const processBulkImport = async (data: any[]) => {
    const errors: any[] = [];
    const processed: any[] = [];
    
    // Ensure we have TRM if needed
    let currentTrm = trm;
    if (!currentTrm) {
        currentTrm = await fetchTRM();
    }

    for (const row of data) {
        const sku = row.SKU?.toString() || '';
        const brandId = parseInt(row.IDMARCA) || 0;
        const catId = parseInt(row.IDCATEGORIA) || 0;
        const name = row.NOMBRE?.toString() || '';
        const desc = row.DESCRIPCIÓN?.toString() || '';
        const specs = row.ESPECTEC?.toString() || '';
        const valUsd = parseFloat(row.VALORUSD) || 0;
        const valCop = parseFloat(row.VALORCOP) || 0;
        const valIva = parseFloat(row.VALOR_IVA) || parseFloat(row["VALOR+IVA"]) || 0;
        const stock = parseInt(row.STOCK) || 0;

        const rowErrors: string[] = [];
        if (!sku) rowErrors.push('SKU');
        if (!name) rowErrors.push('Nombre');
        if (!brandId) rowErrors.push('IDMARCA');
        if (!catId) rowErrors.push('IDCATEGORIA');
        if (!desc) rowErrors.push('Descripción');
        if (valUsd <= 0 && valCop <= 0) rowErrors.push('Valor (USD o COP)');

        // Validate Brand and Category exist
        const brand = brands.find(b => b.id === brandId);
        const category = categories.find(c => c.id === catId);

        if (!brand && brandId) rowErrors.push(`IDMARCA "${brandId}" no existe`);
        if (!category && catId) rowErrors.push(`IDCATEGORIA "${catId}" no existe`);

        // Calculate COP from USD if needed
        let finalPrice = valCop;
        if (valUsd > 0 && valCop <= 0 && currentTrm) {
            finalPrice = Math.round(valUsd * currentTrm);
        }

        const productData = {
            sku,
            name,
            description: desc,
            specs,
            price_usd: valUsd > 0 ? valUsd : null,
            original_price: finalPrice,
            price: finalPrice,
            price_with_iva: valIva > 0 ? valIva : null,
            stock_quantity: stock,
            brand_id: brand ? brand.id : null,
            category_id: category ? category.id : null,
            status: 'Activo',
            last_trm_sync: valUsd > 0 ? new Date().toISOString() : null,
            _incomplete: rowErrors.length > 0,
            _errorFields: rowErrors
        };

        if (rowErrors.length > 0) {
            errors.push({ sku, name, fields: rowErrors, data: productData });
        }
        processed.push(productData);
    }

    if (errors.length > 0) {
        setImportErrors(errors);
        setProcessedBulkData(processed);
        setIsConfirmingImportErrors(true);
    } else {
        await finalizeImport(processed);
    }
  };

  const finalizeImport = async (data: any[]) => {
    setIsSubmitting(true);
    try {
        const { error } = await supabase.from('products').insert(data.map(({_incomplete, _errorFields, ...rest}) => rest));
        if (error) throw error;
        
        alert(`Se han cargado ${data.length} productos con éxito.`);
        // Refresh products
        const { data: refreshed } = await supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false });
        if (refreshed) setProducts(refreshed as Product[]);
        
        setIsConfirmingImportErrors(false);
        setIsBulkImportModalOpen(false);
    } catch (err: any) {
        alert(`Error al importar: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => { switch (status) { case 'Activo': return { color: 'emerald', label: 'Activo' }; case 'Inactivo': case 'Archivado': return { color: 'slate', label: 'Inactivo' }; default: return { color: 'slate', label: status || 'Desconocido' }; } };
  const getStockInfo = (stock: number) => { if (stock === 0) return { color: 'red', unit: 'sin stock' }; if (stock > 0 && stock <= 10) return { color: 'amber', unit: 'crítico' }; return { color: 'slate', unit: 'unidades' }; };
  const statuses = ['Activo', 'Inactivo'];
  const startItem = filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-900">Gestión de Productos</h2><p className="text-slate-500 mt-1">Administra tu inventario de radios y repuestos</p></div>
          <div className="flex items-center gap-3">
            {trm && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg" title="TRM Oficial Superintendencia Financiera">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">payments</span>
                <span className="text-xs font-bold text-emerald-700 font-mono">TRM Oficial: ${formatCurrency(trm)}</span>
              </div>
            )}
            <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-all text-sm">
              <span className="material-symbols-outlined text-[20px]">file_upload</span>
              Exportar
            </button>
            
            <div className="relative" ref={cargaMasivaRef}>
              <button 
                onClick={() => setIsCargaMasivaDropdownOpen(!isCargaMasivaDropdownOpen)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nuevo Producto
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
              </button>
              
              {isCargaMasivaDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="py-1">
                    <button
                      onClick={() => { handleOpenCreateModal(); setIsCargaMasivaDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50"
                    >
                      <span className="material-symbols-outlined text-primary">add_circle</span>
                      <span className="font-medium">Nuevo Producto</span>
                    </button>
                    <label className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-emerald-500">upload_file</span>
                      <span className="font-medium">Carga Masiva</span>
                      <input type="file" className="sr-only" accept=".xlsx, .xls" onChange={(e) => { handleBulkImport(e); setIsCargaMasivaDropdownOpen(false); }} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="relative w-full lg:max-w-md"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="material-symbols-outlined text-slate-400">search</span></div><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="block w-full pl-10 pr-3 py-2.5 border border-slate-600 rounded-lg leading-5 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-shadow" placeholder="Buscar por nombre, marca, categoría, sku..." type="text" /></div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative" ref={categoryRef}><button onClick={() => { setIsCategoryFilterOpen(prev => !prev); setIsStatusFilterOpen(false); }} className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary transition-colors"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría:</span><span className="text-sm font-medium text-slate-900 whitespace-nowrap">{selectedCategoryFilter === 'all' ? 'Todas' : categories.find(c => c.id.toString() === selectedCategoryFilter)?.name}</span><span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px]">keyboard_arrow_down</span></button>
              {isCategoryFilterOpen && (<div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50"><div className="py-1 max-h-60 overflow-y-auto custom-scrollbar"><a href="#" onClick={e => { e.preventDefault(); setSelectedCategoryFilter('all'); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 italic">Todas</a>{categories.map(cat => <a href="#" key={cat.id} onClick={e => { e.preventDefault(); setSelectedCategoryFilter(cat.id.toString()); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">{cat.name}</a>)}</div></div>)}
            </div>
            <div className="relative" ref={statusRef}><button onClick={() => { setIsStatusFilterOpen(prev => !prev); setIsCategoryFilterOpen(false); }} className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary transition-colors"><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado:</span><span className="text-sm font-medium text-slate-900 whitespace-nowrap">{selectedStatusFilter === 'all' ? 'Todos' : selectedStatusFilter}</span><span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px]">keyboard_arrow_down</span></button>
              {isStatusFilterOpen && (<div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50"><div className="py-1"><a href="#" onClick={e => { e.preventDefault(); setSelectedStatusFilter('all'); setIsStatusFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 italic">Todos</a>{statuses.map(status => <a href="#" key={status} onClick={e => { e.preventDefault(); setSelectedStatusFilter(status); setIsStatusFilterOpen(false); setCurrentPage(1); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100">{status}</a>)}</div></div>)}
            </div>
          </div>
        </div>
      </header>
      <div className="p-8 pt-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Precio</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (<tr><td colSpan={7} className="text-center p-8 text-slate-500">Cargando...</td></tr>) : error ? (<tr><td colSpan={7} className="text-center p-8 text-red-600 bg-red-50">{error}</td></tr>) : paginatedProducts.length > 0 ? (paginatedProducts.map((p) => {
                  const statusInfo = getStatusInfo(p.status); const stockInfo = getStockInfo(p.stock_quantity);
                  const isOffer = p.original_price && p.original_price > 0 && Number(p.price) < Number(p.original_price);
                  const urls = parseImageUrls(p.image_urls);
                  const imgUrl = urls.length > 0 ? urls[0] : null;
                  return (<tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${(!p.sku || !p.description || !p.brand_id || !p.category_id) ? 'bg-red-50/50' : ''}`}>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right"><div className="flex flex-col items-end"><span className="text-sm font-bold text-slate-900 font-mono">${formatCurrency(p.price)}</span>{isOffer && <span className="text-xs text-red-500 line-through font-mono">${formatCurrency(p.original_price || 0)}</span>}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-center"><div className="flex flex-col items-center"><span className={`text-sm font-medium text-${stockInfo.color}-600`}>{p.stock_quantity}</span><span className={`text-[10px] text-${stockInfo.color}-500/70`}>{stockInfo.unit}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-1.5"><span className={`size-2 rounded-full bg-${statusInfo.color}-500`}></span><span className={`text-sm ${statusInfo.color === 'slate' ? 'text-slate-500' : 'text-slate-700'}`}>{statusInfo.label}</span></div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><div className="flex items-center justify-end gap-2"><button onClick={() => handleOpenEditModal(p)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button><button onClick={() => openDeleteModal(p)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button></div></td>
                    </tr>);
                })) : (<tr><td colSpan={7} className="text-center p-8 text-slate-500">No se encontraron productos.</td></tr>)
              }
            </tbody>
          </table>
        </div>
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

          <div><label className="block text-sm font-medium text-slate-700 mb-2">Nombre <span className="text-red-500">*</span></label><input type="text" name="name" value={productForm.name} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Especificaciones Técnicas</label><textarea name="specs" value={productForm.specs} onChange={handleFormChange} rows={3} placeholder="Ingrese las especificaciones técnicas..." className="block w-full rounded-lg border-slate-600 px-4 py-2 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"></textarea></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Descripción <span className="text-red-500">*</span></label><textarea name="description" value={productForm.description} onChange={handleFormChange} required rows={3} className="block w-full rounded-lg border-slate-600 px-4 py-2 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"></textarea></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Categoria <span className="text-red-500">*</span></label><select name="category_id" value={productForm.category_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Marca <span className="text-red-500">*</span></label><select name="brand_id" value={productForm.brand_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">SKU <span className="text-red-500">*</span></label><input type="text" name="sku" value={productForm.sku} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Stock <span className="text-red-500">*</span></label><input type="number" name="stock_quantity" value={productForm.stock_quantity} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" /></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
              <div className="flex items-center gap-3 h-[38px]">
                <button
                  type="button"
                  onClick={() => setProductForm(prev => ({ ...prev, status: prev.status === 'Activo' ? 'Inactivo' : 'Activo' }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${productForm.status === 'Activo' ? 'bg-primary' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${productForm.status === 'Activo' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className={`text-sm font-medium ${productForm.status === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {productForm.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valor USD</label>
              <input type="number" name="price_usd" value={productForm.price_usd} onChange={(e) => {
                const val = e.target.value;
                setProductForm(prev => {
                  const newState = { ...prev, price_usd: val };
                  if (val && trm) {
                    newState.original_price = (parseFloat(val) * trm).toFixed(0);
                  }
                  return newState;
                });
              }} placeholder="0.00" className="block w-full rounded-lg border-emerald-600 px-4 py-[10.5px] bg-emerald-50/30 text-emerald-900 shadow-[0_2px_4px_rgba(16,185,129,0.1)] focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-bold" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Precio Original (COP) <span className="text-red-500">*</span></label>
              <input type="number" name="original_price" value={productForm.original_price} onChange={handleFormChange} required placeholder="Ej: 299000" className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm font-bold" step="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Valor + IVA</label>
              <input type="number" name="price_with_iva" value={productForm.price_with_iva} onChange={handleFormChange} placeholder="0" className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" step="1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <input id="is-offer" type="checkbox" checked={isOfferActive} onChange={e => setIsOfferActive(e.target.checked)} className="h-4 w-4 rounded border-slate-600 text-primary focus:ring-primary"/>
             <label htmlFor="is-offer" className="text-sm font-medium text-slate-700">Oferta</label>
          </div>
          {isOfferActive && (
            <div className="space-y-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Precio de Oferta <span className="text-red-500">*</span></label>
                <input type="number" name="price" value={productForm.price} onChange={handleFormChange} required={isOfferActive} placeholder="Ej: 249.00" className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" step="0.01" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Inicio de Oferta <span className="text-red-500">*</span></label>
                      <input type="datetime-local" name="offer_start_date" value={productForm.offer_start_date} onChange={handleFormChange} required={isOfferActive} className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Finalización de Oferta <span className="text-red-500">*</span></label>
                      <input type="datetime-local" name="offer_end_date" value={productForm.offer_end_date} onChange={handleFormChange} required={isOfferActive} className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" />
                  </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Imágenes (Max 5) <span className="text-red-500">*</span></label>
                <span className="text-xs text-slate-500">{imagePreviewUrls.length} / 5</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {imagePreviewUrls.map((preview) => (
                    <div key={preview.id} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 group">
                        <Image src={preview.url} alt="Preview" fill sizes="(max-width: 768px) 50vw, 10vw" className="object-cover" />
                        <button 
                            type="button" 
                            onClick={() => handleRemoveImage(preview.id)}
                            className="absolute top-1 right-1 size-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                        {!preview.isExisting && (
                            <span className="absolute bottom-1 left-1 bg-primary text-white text-[8px] px-1 rounded uppercase font-bold">Nuevo</span>
                        )}
                    </div>
                ))}
                
                {imagePreviewUrls.length < 5 && (
                    <label className="aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-50 hover:border-primary hover:bg-slate-100 cursor-pointer transition-all">
                        <span className="material-symbols-outlined text-slate-400 text-3xl">add_a_photo</span>
                        <span className="text-[10px] font-medium text-slate-500 mt-1">Añadir</span>
                        <input type="file" className="sr-only" onChange={handleImageChange} accept="image/*" multiple />
                    </label>
                )}
            </div>
          </div>
        </form>
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={handleCloseModal} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button>
          <button form="product-form" disabled={isSubmitting} type="submit" className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed transition-all">
            {isSubmitting ? (productToEdit ? 'Guardando...' : 'Creando...') : (productToEdit ? 'Guardar Cambios' : 'Crear Producto')}
          </button>
        </div>
      </div></div>)}

      {isDeleteModalOpen && productToDelete && (<div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"><div className="p-6 flex items-start gap-4"><div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-3xl">warning</span></div><div><h2 className="text-xl font-bold text-slate-900">Eliminar Producto</h2><p className="text-slate-600 mt-2">¿Estás seguro de que quieres eliminar "<strong>{productToDelete.name}</strong>"? Esta acción es irreversible.</p></div></div><div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={closeDeleteModal} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button><button onClick={handleConfirmDelete} disabled={isDeleting} type="button" className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md disabled:bg-red-600/50 disabled:cursor-not-allowed transition-all">{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</button></div></div></div>)}

      {/* Modal de Confirmación de Errores en Carga Masiva */}
      {isConfirmingImportErrors && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-amber-50">
              <div className="size-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl">report_problem</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Errores de Validación</h2>
                <p className="text-sm text-slate-600 mt-1">Se han encontrado inconsistencias en {importErrors.length} productos.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {importErrors.map((err, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm border-l-4 border-l-amber-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-slate-900 font-mono">SKU: {err.sku || 'SIN SKU'}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{err.name || 'Sin nombre'}</span>
                  </div>
                  <p className="text-xs text-slate-500">Falta información en los campos:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {err.fields.map((f: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider border border-red-100">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <div className="p-4 bg-white border border-slate-200 rounded-xl mb-4">
                <p className="text-xs text-slate-500 leading-relaxed text-center">
                  ¿Desea continuar con el cargue? Los productos marcados con errores se cargarán pero deberán ser completados manualmente.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsConfirmingImportErrors(false)} 
                  className="flex-1 px-4 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all font-display"
                >
                  Cancelar Cargue
                </button>
                <button 
                  onClick={async () => {
                    await finalizeImport(processedBulkData);
                  }}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md shadow-primary/20 font-display"
                >
                  Continuar con el Cargue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
