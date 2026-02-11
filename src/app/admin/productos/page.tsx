'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { convertToWebP } from '@/lib/image-utils';
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
  cost: number | null;
  profit_percentage: number | null;
  brand_id: number;
  warehouse_id: string | null;
  auxiliary_warehouse_id: string | null;
  main_warehouse_stock: number;
  auxiliary_warehouse_stock: number;
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

interface Warehouse {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'Admin' | 'Vendedor' | null;
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  
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
    cost: '',
    profit_percentage: '',
    warehouse_id: '',
    auxiliary_warehouse_id: '',
    main_warehouse_stock: '',
    auxiliary_warehouse_stock: '',
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
  const [isShowImportPreview, setIsShowImportPreview] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
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

  const roundIvaPrice = (price: number): number => {
    const remainder = price % 1000;
    if (remainder === 0) return price;
    if (remainder <= 500) return Math.floor(price / 1000) * 1000 + 500;
    return Math.ceil(price / 1000) * 1000;
  };

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
    fetchUserProfile();
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
      const [productsPromise, categoriesPromise, brandsPromise, warehousesPromise, trmValue] = await Promise.all([
        supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name').eq('status', 'Activo'),
        supabase.from('brands').select('id, name'),
        supabase.from('warehouses').select('id, name').eq('status', 'Activo'),
        fetchTRM()
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
      if (warehousesPromise.error) setError(prev => `${prev || ''}, ${warehousesPromise.error.message}`); else setWarehouses(warehousesPromise.data as Warehouse[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) setCurrentUserProfile(profile);
    }
  };

  const fetchTRM = async () => {
    setLoadingTrm(true);
    try {
      // DolarApi.com - Tasa Representativa del Mercado
      const response = await fetch('https://co.dolarapi.com/v1/cotizaciones/usd');
      const data = await response.json();
      if (data && data.compra) {
        setTrm(data.compra);
        return data.compra;
      }
      return null;
    } catch (err) {
      console.error("Error fetching TRM from DolarApi:", err);
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

    const updates = productsToSync.map(p => {
      const newCost = Math.round(p.price_usd! * currentTrm);
      const profitPct = p.profit_percentage || 0;
      const ventaSugerida = newCost * (1 + profitPct / 100);
      const finalRounded = roundIvaPrice(Math.round(ventaSugerida * 1.19));
      const baseAjustada = Math.round(finalRounded / 1.19);
      const margenReal = ((baseAjustada / newCost) - 1) * 100;

      return {
        id: p.id,
        cost: newCost,
        original_price: baseAjustada,
        price: baseAjustada,
        price_with_iva: finalRounded,
        profit_percentage: margenReal,
        last_trm_sync: new Date().toISOString()
      };
    });

    // Perform updates in batch (Supabase doesn't support bulk update with different values easily in a single call without RPC, 
    // but we can do it one by one or via a loop for now or a custom RPC)
    // For simplicity and to avoid too many RPCs, we'll do them one by one or in a Promise.all
    try {
      await Promise.all(updates.map(u => 
        supabase.from('products').update({ 
          cost: u.cost,
          original_price: u.original_price,
          price: u.price, 
          price_with_iva: u.price_with_iva,
          profit_percentage: u.profit_percentage,
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
      cost: '',
      profit_percentage: '',
      warehouse_id: '',
      auxiliary_warehouse_id: '',
      main_warehouse_stock: '0',
      auxiliary_warehouse_stock: '0',
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
        cost: product.cost?.toString() || '',
        profit_percentage: product.profit_percentage?.toString() || '',
        warehouse_id: product.warehouse_id || '',
        auxiliary_warehouse_id: product.auxiliary_warehouse_id || '',
        main_warehouse_stock: product.main_warehouse_stock?.toString() || '0',
        auxiliary_warehouse_stock: product.auxiliary_warehouse_stock?.toString() || '0',
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
  
  const harmonizePrice = (fieldName: string, value: string) => {
    setProductForm(prev => {
        const costNum = parseFloat(prev.cost || '0');
        const profitPctNum = parseFloat(prev.profit_percentage || '0');
        const originalPriceNum = parseFloat(prev.original_price || '0');
        
        // Final Price based on current values (rounded)
        let finalRounded = 0;
        if (fieldName === 'original_price') {
            finalRounded = roundIvaPrice(Math.round(parseFloat(value) * 1.19));
        } else if (fieldName === 'profit_percentage') {
            const ventaSugerida = costNum * (1 + parseFloat(value) / 100);
            finalRounded = roundIvaPrice(Math.round(ventaSugerida * 1.19));
        } else if (fieldName === 'cost') {
            const ventaSugerida = parseFloat(value) * (1 + profitPctNum / 100);
            finalRounded = roundIvaPrice(Math.round(ventaSugerida * 1.19));
        } else {
            // Default snap based on existing original_price
            finalRounded = roundIvaPrice(Math.round(originalPriceNum * 1.19));
        }

        const baseAjustada = Math.round(finalRounded / 1.19);
        const newState = { ...prev, [fieldName]: value, price_with_iva: finalRounded.toString(), original_price: baseAjustada.toString() };
        
        // Recalculate profit percentage for consistency
        const currentCost = fieldName === 'cost' ? parseFloat(value) : costNum;
        if (currentCost > 0) {
            const margenReal = ((baseAjustada / currentCost) - 1) * 100;
            newState.profit_percentage = margenReal.toFixed(2);
        }

        return newState;
    });
  };

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

    const { name, description, category_id, brand_id, sku, price, original_price, main_warehouse_stock, auxiliary_warehouse_stock, offer_start_date, offer_end_date, status, price_usd, price_with_iva, specs, cost, profit_percentage, warehouse_id, auxiliary_warehouse_id } = productForm;
    const totalStock = (parseInt(main_warehouse_stock || '0') + parseInt(auxiliary_warehouse_stock || '0'));

    if (!name || !description || !category_id || !brand_id || !sku || !original_price || !warehouse_id) {
      setFormError('Todos los campos marcados con * son obligatorios, incluyendo la Bodega Principal.');
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

    // Validation: Enforce data completion for Activation
    if (status === 'Activo') {
        const missingFields: string[] = [];
        if (!name) missingFields.push('Nombre');
        if (!description) missingFields.push('Descripción');
        if (!category_id) missingFields.push('Categoría');
        if (!brand_id) missingFields.push('Marca');
        if (!sku) missingFields.push('SKU');
        if (!original_price) missingFields.push('Precio');
        
        if (missingFields.length > 0 || imagePreviewUrls.length === 0) {
            setFormError(`No se puede activar el producto. Faltan campos obligatorios o imágenes.`);
            setIsSubmitting(false);
            return;
        }
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
      // 1. Upload new images to Cloudflare R2
      const finalUrls: string[] = [];
      for (const preview of imagePreviewUrls) {
        if (preview.isExisting) {
          finalUrls.push(preview.url);
        } else if (preview.file) {
          const file = preview.file;
          
          // Optimization: Convert to WebP on the fly
          const webpBlob = await convertToWebP(file);
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

          // Request presigned URL from our API
          const presignedRes = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              contentType: 'image/webp',
              folder: 'productos'
            })
          });

          if (!presignedRes.ok) throw new Error('Error al obtener URL de subida');
          const { signedUrl, publicUrl } = await presignedRes.json();

          // Upload directly to Cloudflare R2
          const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            body: webpBlob,
            headers: { 'Content-Type': 'image/webp' }
          });

          if (!uploadRes.ok) throw new Error('Error al subir imagen a Cloudflare');
          
          finalUrls.push(publicUrl);
        }
      }

      // 2. Delete removed images from storage (Both Supabase and R2)
      if (imagesToDelete.length > 0) {
        for (const urlToDelete of imagesToDelete) {
            try {
                const urlObj = new URL(urlToDelete);
                if (urlObj.hostname.includes('r2.dev')) {
                    // It's an R2 image, call our DELETE API
                    await fetch('/api/upload/presigned', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicUrl: urlToDelete })
                    });
                } else if (urlObj.hostname.includes('supabase.co')) {
                    // It's an old Supabase image
                    const pathParts = urlObj.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    await supabase.storage.from('product_images').remove([fileName]);
                }
            } catch (err) {
                console.error("Error deleting image from storage:", err);
            }
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
          stock_quantity: totalStock,
          main_warehouse_stock: parseInt(main_warehouse_stock || '0'),
          auxiliary_warehouse_stock: parseInt(auxiliary_warehouse_stock || '0'),
          cost: cost ? parseFloat(cost) : null,
          profit_percentage: profit_percentage ? parseFloat(profit_percentage) : null,
          image_urls: finalUrls, 
          status: dbStatus, 
          offer_start_date: finalOfferStartDate, 
          offer_end_date: finalOfferEndDate,
          warehouse_id: warehouse_id || null,
          auxiliary_warehouse_id: auxiliary_warehouse_id || null,
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
    if (!productToDelete) return; 
    setIsDeleting(true);
    try {
      // 1. First attempt to delete from the database
      const { error: dbError } = await supabase.from('products').delete().eq('id', productToDelete.id);
      
      if (dbError) {
        // Handle Foreign Key constraint error (it has sales history)
        const isForeignKeyError = dbError.code === '23503' || 
                                 dbError.message?.toLowerCase().includes('foreign key constraint');

        if (isForeignKeyError) {
          alert("Este elemento no se puede eliminar ya que está enlazado con pedidos u otros registros.");
          setIsDeleting(false);
          return;
        }
        throw dbError;
      }

      // 2. If deletion was successful, NOW clean up images from storage
      const urls = parseImageUrls(productToDelete.image_urls);
      if (urls.length > 0) {
        for (const urlToDelete of urls) {
            try {
                const urlObj = new URL(urlToDelete);
                if (urlObj.hostname.includes('r2.dev')) {
                    await fetch('/api/upload/presigned', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicUrl: urlToDelete })
                    });
                } else if (urlObj.hostname.includes('supabase.co')) {
                    const pathParts = urlObj.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    await supabase.storage.from('product_images').remove([fileName]);
                }
            } catch (err) {
                console.error("Error deleting image during product deletion:", err);
            }
        }
      }

      alert("Producto eliminado por completo."); 
      setProducts(products.filter(p => p.id !== productToDelete.id)); 
      closeDeleteModal();
    } catch (err: any) { 
      alert(`Error al eliminar el producto: ${err.message}`);
    } finally { 
      setIsDeleting(false); 
    }
  };

  const toggleStatus = async (product: Product) => {
    const newStatus = product.status === 'Activo' ? 'Inactivo' : 'Activo';
    
    // Incomplete products cannot be activated
    if (newStatus === 'Activo') {
        const urls = parseImageUrls(product.image_urls);
        if (!product.sku || !product.description || !product.brand_id || !product.category_id || urls.length === 0) {
            alert("No se puede activar un producto incompleto. Por favor, completa SKU, Descripción, Marca, Categoría e Imágenes.");
            return;
        }
    }

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
    } catch (err: any) {
      alert(`Error al cambiar el estado: ${err.message}`);
    }
  };

  const handleExport = () => {
    if (!filteredProducts.length) { alert("No hay productos para exportar."); return; }
    const exportData = filteredProducts.map(p => ({ ID: p.id, Nombre: p.name, Descripción: p.description || '', SKU: p.sku || 'N/A', Precio: p.price, Stock: p.stock_quantity, Estado: p.status, Categoría: categories.find(c => c.id === p.category_id)?.name || 'N/A', Marca: p.brands?.name || 'N/A' }));
    const ws = XLSX.utils.json_to_sheet(exportData); 
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos"); 
    XLSX.writeFile(wb, "mundolar-productos.xlsx");
  };
 
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        BODEGA_P: "01",
        BODEGA_A: "02",
        SKU: "RAD-001",
        IDMARCA: 1,
        IDCATEGORIA: 1,
        NOMBRE: "Radio Motorola DEP450",
        DESCRIPCIÓN: "Radio portátil digital/analógico",
        ESPECTEC: "16 canales, UHF/VHF",
        COSTOUSD: 250,
        COSTO: 1000000,
        PORVENTA: 20,
        VALORVENTA: 1200000,
        "VALOR+IVA": 1428000,
        STOCK_P: 10,
        STOCK_A: 5
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Cargue");
    XLSX.writeFile(wb, "plantilla-mundolar-productos.xlsx");
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
    setIsProcessingImport(true);
    setImportProgress(0);
    const errors: any[] = [];
    const processed: any[] = [];
    
    // Ensure we have TRM if needed
    let currentTrm = trm;
    if (!currentTrm) {
        currentTrm = await fetchTRM();
    }

    const total = data.length;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Simulate processing delay to show progress bar
        if (total > 10 && i % Math.ceil(total / 10) === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
        setImportProgress(Math.round(((i + 1) / total) * 100));

        const sku = row.SKU?.toString() || '';
        const brandId = parseInt(row.IDMARCA) || 0;
        const catId = parseInt(row.IDCATEGORIA) || 0;
        const name = row.NOMBRE?.toString() || '';
        const desc = row.DESCRIPCIÓN?.toString() || '';
        const specs = row.ESPECTEC?.toString() || '';
        
        const rawCostUsd = parseFloat(row.COSTOUSD) || 0;
        let rawCostCop = parseFloat(row.COSTO) || 0;
        const profitPct = parseFloat(row.PORVENTA) || 0;
        let valVenta = parseFloat(row.VALORVENTA) || 0;
        let valIvaPlus = parseFloat(row["VALOR+IVA"]) || 0;
        
        // New Columns
        const warehouseId = row.BODEGA_P?.toString() || '';
        const auxWarehouseId = row.BODEGA_A?.toString() || '';
        const mainStock = parseInt(row.STOCK_P) || 0;
        const auxStock = parseInt(row.STOCK_A) || 0;
        const totalStock = mainStock + auxStock;

        // 1. Calculate Cost if USD is provided but COP is empty
        if (rawCostUsd > 0 && rawCostCop <= 0 && currentTrm) {
            rawCostCop = Math.round(rawCostUsd * currentTrm);
        }

        // 2 & 3. Calculate Sale Price with Rounding Adjustment
        let profitPctCalculated = profitPct;
        if (profitPct > 0 && rawCostCop > 0) {
            const ventaSugerida = rawCostCop * (1 + profitPct / 100);
            valIvaPlus = roundIvaPrice(Math.round(ventaSugerida * 1.19));
            valVenta = Math.round(valIvaPlus / 1.19);
            profitPctCalculated = ((valVenta / rawCostCop) - 1) * 100;
        } else if (valVenta > 0) {
            valIvaPlus = roundIvaPrice(Math.round(valVenta * 1.19));
            valVenta = Math.round(valIvaPlus / 1.19);
            if (rawCostCop > 0) {
                profitPctCalculated = ((valVenta / rawCostCop) - 1) * 100;
            }
        }

        const rowErrors: string[] = [];
        if (!sku) rowErrors.push('Agregar SKU');
        if (!name) rowErrors.push('Agregar Nombre');
        if (brandId <= 0) rowErrors.push('Agregar Marca');
        if (catId <= 0) rowErrors.push('Agregar Categoría');
        if (!desc) rowErrors.push('Agregar Descripción');
        if (rawCostCop <= 0 && valVenta <= 0) rowErrors.push('Agregar Precio/Costo');
        if (totalStock <= 0) rowErrors.push('Sin stock definido');
        if (!warehouseId) rowErrors.push('Falta Bodega P');
        
        // Mandatory Image Observation
        rowErrors.push('Agregar imagen');

        // Validate Brand and Category exist
        const brand = brands.find(b => b.id === brandId);
        const category = categories.find(c => c.id === catId);
        const warehouse = warehouses.find(w => w.id === warehouseId);
        const auxWarehouse = auxWarehouseId ? warehouses.find(w => w.id === auxWarehouseId) : null;

        if (!brand && brandId) rowErrors.push(`IDMARCA "${brandId}" no existe`);
        if (!category && catId) rowErrors.push(`IDCATEGORIA "${catId}" no existe`);
        if (!warehouse && warehouseId) rowErrors.push(`Bodega P "${warehouseId}" no existe`);
        if (!auxWarehouse && auxWarehouseId) rowErrors.push(`Bodega A "${auxWarehouseId}" no existe`);

        const productData = {
            sku,
            name,
            description: desc,
            specs: specs || null,
            cost: rawCostCop > 0 ? rawCostCop : null,
            profit_percentage: profitPctCalculated > 0 ? profitPctCalculated : null,
            price_usd: rawCostUsd > 0 ? rawCostUsd : null,
            original_price: valVenta > 0 ? valVenta : (rawCostCop > 0 ? rawCostCop : null),
            price: valVenta > 0 ? valVenta : (rawCostCop > 0 ? rawCostCop : null),
            price_with_iva: valIvaPlus > 0 ? valIvaPlus : null,
            stock_quantity: totalStock,
            main_warehouse_stock: mainStock,
            auxiliary_warehouse_stock: auxStock,
            warehouse_id: warehouseId || null,
            auxiliary_warehouse_id: auxWarehouseId || null,
            brand_id: brand ? brand.id : null,
            category_id: category ? category.id : null,
            status: 'Archivado', // Always Inactivo from bulk import due to missing images
            last_trm_sync: rawCostUsd > 0 ? new Date().toISOString() : null,
            _incomplete: true, // Always incomplete because of mandatory images
            _errorFields: rowErrors,
            _brandName: brand?.name || 'ID ' + brandId || 'N/A',
            _categoryName: category?.name || 'ID ' + catId || 'N/A',
            _warehouseName: warehouse?.name || 'Bodega ' + warehouseId || 'N/A'
        };

        if (rowErrors.length > 0) {
            errors.push({ sku, name, fields: rowErrors, data: productData });
        }
        processed.push(productData);
    }

    setImportErrors(errors);
    setProcessedBulkData(processed);
    setIsProcessingImport(false);
    setIsShowImportPreview(true);
  };
  const finalizeImport = async (data: any[]) => {
    setIsSubmitting(true);
    try {
        const { error } = await supabase
            .from('products')
            .upsert(
              data.map(({_incomplete, _errorFields, _brandName, _categoryName, _warehouseName, ...rest}) => rest),
              { onConflict: 'sku' }
            );
        if (error) throw error;
        
        // Removed browser alert as requested
        // Refresh products
        const { data: refreshed } = await supabase.from('products').select('*, brands(name)').order('created_at', { ascending: false });
        if (refreshed) setProducts(refreshed as Product[]);
        
        setIsShowImportPreview(false);
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
      <header className="bg-white border-b border-slate-200 px-8 py-6 relative z-30 space-y-6">
        {/* Title and Management Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Gestión de Productos</h2>
            <p className="text-slate-500 text-sm font-medium">Administra tu inventario de radios y repuestos.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {(trm || loadingTrm) && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700" title="USD TRM Oficial">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span className="text-xs font-bold font-mono">
                  {loadingTrm ? '...' : `USD: $${formatCurrency(trm!)}`}
                </span>
              </div>
            )}

            {currentUserProfile?.role === 'Admin' && (
              <>
                {/* Dropdown de Carga Masiva */}
                <div className="relative" ref={cargaMasivaRef}>
                  <button
                    onClick={() => setIsCargaMasivaDropdownOpen(!isCargaMasivaDropdownOpen)}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                    Importar
                    <span className={`material-symbols-outlined text-[18px] transition-transform ${isCargaMasivaDropdownOpen ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                  </button>

                  {isCargaMasivaDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <button 
                        onClick={() => {
                          handleDownloadTemplate();
                          setIsCargaMasivaDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Descargar Plantilla
                      </button>
                      <button 
                        onClick={() => {
                          handleExport();
                          setIsCargaMasivaDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">ios_share</span>
                        Exportar Listado
                      </button>
                      <div className="px-4 py-2 border-t border-slate-50 mt-1">
                        <label className="w-full block bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center">
                          <span className="material-symbols-outlined text-[18px] mb-1 block text-primary">file_upload</span>
                          Cargar Archivo
                          <input type="file" accept=".xlsx, .xls" onChange={handleBulkImport} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleOpenCreateModal}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95 shrink-0 text-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Nuevo Producto
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-6">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            </div>
            <input 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-display shadow-[0_4px_12px_rgba(0,0,0,0.15)] outline-none" 
              placeholder="Buscar por nombre, marca, categoría, sku..." 
              type="text" 
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative" ref={categoryRef}>
              <button 
                onClick={() => { setIsCategoryFilterOpen(prev => !prev); setIsStatusFilterOpen(false); }} 
                className="group w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-primary transition-all shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display"
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Categoría:</span>
                <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                  {selectedCategoryFilter === 'all' ? 'Todas' : categories.find(c => c.id.toString() === selectedCategoryFilter)?.name}
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px] transition-transform">expand_more</span>
              </button>
              {isCategoryFilterOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-100 p-1">
                  <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                    <a href="#" onClick={e => { e.preventDefault(); setSelectedCategoryFilter('all'); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-slate-600 block px-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors font-display italic">Todas</a>
                    {categories.map(cat => (
                      <a href="#" key={cat.id} onClick={e => { e.preventDefault(); setSelectedCategoryFilter(cat.id.toString()); setIsCategoryFilterOpen(false); setCurrentPage(1); }} className="text-slate-700 block px-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors font-display">{cat.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={statusRef}>
              <button 
                onClick={() => { setIsStatusFilterOpen(prev => !prev); setIsCategoryFilterOpen(false); }} 
                className="group w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-primary transition-all shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display"
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado:</span>
                <span className="text-sm font-medium text-slate-900 whitespace-nowrap">{selectedStatusFilter === 'all' ? 'Todos' : selectedStatusFilter}</span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-[20px] transition-transform">expand_more</span>
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-slate-100 p-1">
                  <div className="py-1">
                    <a href="#" onClick={e => { e.preventDefault(); setSelectedStatusFilter('all'); setIsStatusFilterOpen(false); setCurrentPage(1); }} className="text-slate-600 block px-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors font-display italic">Todos</a>
                    {statuses.map(status => (
                      <a href="#" key={status} onClick={e => { e.preventDefault(); setSelectedStatusFilter(status); setIsStatusFilterOpen(false); setCurrentPage(1); }} className="text-slate-700 block px-4 py-2 text-sm hover:bg-slate-50 rounded-lg transition-colors font-display">{status}</a>
                    ))}
                  </div>
                </div>
              )}
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Venta / +IVA</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Bodega Principal</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Bodega Auxiliar</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  {currentUserProfile?.role === 'Admin' && (
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (<tr><td colSpan={7} className="text-center p-8 text-slate-500">Cargando...</td></tr>) : error ? (<tr><td colSpan={7} className="text-center p-8 text-red-600 bg-red-50">{error}</td></tr>) : paginatedProducts.length > 0 ? (paginatedProducts.map((p) => {
                  const statusInfo = getStatusInfo(p.status); const stockInfo = getStockInfo(p.stock_quantity);
                  const isOffer = p.original_price && p.original_price > 0 && Number(p.price) < Number(p.original_price);
                  const urls = parseImageUrls(p.image_urls);
                  const imgUrl = urls.length > 0 ? urls[0] : null;
                  const isIncomplete = !p.sku || !p.description || !p.brand_id || !p.category_id || urls.length === 0;
                  return (<tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${isIncomplete ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Venta:</span>
                            <span className="text-sm font-bold text-slate-900 font-mono">${formatCurrency(p.original_price || p.price)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-primary/70 uppercase">+IVA:</span>
                            <span className="text-sm font-black text-primary font-mono">${formatCurrency(p.price_with_iva || 0)}</span>
                          </div>
                          {isOffer && (
                            <span className="text-[10px] text-red-500 line-through font-mono opacity-70">
                              Ant: ${formatCurrency(p.original_price || 0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                            {warehouses.find(w => w.id === p.warehouse_id)?.name || 'No asignada'}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1 font-mono">
                            {p.main_warehouse_stock || 0} unid.
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {warehouses.find(w => w.id === p.auxiliary_warehouse_id)?.name || 'Ninguna'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">
                            {p.auxiliary_warehouse_stock || 0} unid.
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-bold text-${stockInfo.color}-600`}>
                            {p.stock_quantity}
                          </span>
                          <span className={`text-[10px] text-${stockInfo.color}-500/70`}>
                            {stockInfo.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentUserProfile?.role === 'Admin') {
                                toggleStatus(p);
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${p.status === 'Activo' ? 'bg-primary' : 'bg-slate-200'} ${currentUserProfile?.role !== 'Admin' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                            disabled={currentUserProfile?.role !== 'Admin'}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.status === 'Activo' ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <span className={`text-xs font-medium ${p.status === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {p.status}
                          </span>
                        </div>
                      </td>
                      {currentUserProfile?.role === 'Admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleOpenEditModal(p)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button onClick={() => openDeleteModal(p)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>);
                })) : (<tr><td colSpan={9} className="text-center p-8 text-slate-500">No se encontraron productos.</td></tr>)
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

          {/* 1. Marca y Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Marca <span className="text-red-500">*</span></label><select name="brand_id" value={productForm.brand_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Categoría <span className="text-red-500">*</span></label><select name="category_id" value={productForm.category_id} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"><option value="" disabled>Seleccionar...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>

          {/* 2. SKU y Nombre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">SKU <span className="text-red-500">*</span></label><input type="text" name="sku" value={productForm.sku} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Nombre <span className="text-red-500">*</span></label><input type="text" name="name" value={productForm.name} onChange={handleFormChange} required className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" /></div>
          </div>

          {/* 3. Descripción */}
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Descripción <span className="text-red-500">*</span></label><textarea name="description" value={productForm.description} onChange={handleFormChange} required rows={3} className="block w-full rounded-lg border-slate-600 px-4 py-2 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"></textarea></div>

          {/* 4. Especificaciones Técnicas */}
          <div><label className="block text-sm font-medium text-slate-700 mb-2">Especificaciones Técnicas</label><textarea name="specs" value={productForm.specs} onChange={handleFormChange} rows={3} placeholder="Ingrese las especificaciones técnicas..." className="block w-full rounded-lg border-slate-600 px-4 py-2 bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"></textarea></div>

          {/* 5. Estado y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Stock Total (Calculado)</label>
                <div className="px-4 py-[10.5px] bg-slate-100 rounded-lg border border-slate-200 text-slate-500 font-bold text-sm">
                    {(parseInt(productForm.main_warehouse_stock || '0') + parseInt(productForm.auxiliary_warehouse_stock || '0')).toString()} unidades
                </div>
            </div>
          </div>

          {/* 6. Bodegas y Stocks Individuales */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">inventory</span>
                Distribución de Stock
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Bodega Principal <span className="text-red-500">*</span></label>
                        <select 
                            name="warehouse_id" 
                            value={productForm.warehouse_id} 
                            onChange={handleFormChange} 
                            required 
                            className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"
                        >
                            <option value="">Seleccionar...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                        </select>
                    </div>
                    {productForm.warehouse_id && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-primary mb-2 italic">Stock en Bodega Principal *</label>
                            <input 
                                type="number" 
                                name="main_warehouse_stock" 
                                value={productForm.main_warehouse_stock} 
                                onChange={handleFormChange} 
                                placeholder="0"
                                required
                                className="block w-full rounded-lg border-primary/30 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm font-bold" 
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Bodega Auxiliar</label>
                        <select 
                            name="auxiliary_warehouse_id" 
                            value={productForm.auxiliary_warehouse_id} 
                            onChange={handleFormChange} 
                            className="block w-full rounded-lg border-slate-600 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm"
                        >
                            <option value="">Ninguna</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                        </select>
                    </div>
                    {productForm.auxiliary_warehouse_id && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-slate-700 mb-2 italic">Stock en Bodega Auxiliar</label>
                            <input 
                                type="number" 
                                name="auxiliary_warehouse_stock" 
                                value={productForm.auxiliary_warehouse_stock} 
                                onChange={handleFormChange} 
                                placeholder="0"
                                className="block w-full rounded-lg border-slate-300 px-4 py-[10.5px] bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] focus:border-primary focus:ring-primary sm:text-sm" 
                            />
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Bloque de Precios (Azul) */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-6">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 border-b border-blue-100 pb-2">
              <span className="material-symbols-outlined text-[20px]">payments</span>
              Gestión de Costos y Precios
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-tight">Costo de Compra (COP) <span className="text-red-500">*</span></label>
                <input type="number" name="cost" value={productForm.cost} onChange={(e) => {
                  const val = e.target.value;
                  setProductForm(prev => {
                      const newState = { ...prev, cost: val };
                      if (val && prev.profit_percentage) {
                          const venta = Math.round(parseFloat(val) * (1 + parseFloat(prev.profit_percentage) / 100));
                          newState.original_price = venta.toString();
                          newState.price_with_iva = roundIvaPrice(Math.round(venta * 1.19)).toString();
                      }
                      return newState;
                  });
                }} 
                onBlur={(e) => harmonizePrice('cost', e.target.value)}
                required placeholder="0" className="block w-full rounded-lg border-blue-200 px-4 py-2.5 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-tight">Costo USD (Auto-conversión)</label>
                <input type="number" name="price_usd" value={productForm.price_usd} onChange={(e) => {
                  const val = e.target.value;
                    setProductForm(prev => {
                      const newState = { ...prev, price_usd: val };
                      if (val && trm) {
                        const convertedCost = Math.round(parseFloat(val) * trm);
                        newState.cost = convertedCost.toString();
                        // Cascade to sale price (preview)
                        if (prev.profit_percentage) {
                          const venta = Math.round(convertedCost * (1 + parseFloat(prev.profit_percentage) / 100));
                          newState.original_price = venta.toString();
                          newState.price_with_iva = roundIvaPrice(Math.round(venta * 1.19)).toString();
                        }
                      }
                      return newState;
                    });
                }} 
                onBlur={(e) => {
                  if (e.target.value && trm) {
                    const convertedCost = Math.round(parseFloat(e.target.value) * trm);
                    harmonizePrice('cost', convertedCost.toString());
                  }
                }}
                placeholder="0.00" className="block w-full rounded-lg border-emerald-200 px-4 py-2.5 bg-emerald-50/30 text-emerald-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm font-bold" step="0.01" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-tight">Margen Ganancia (%)</label>
                <div className="relative">
                  <input type="number" name="profit_percentage" value={productForm.profit_percentage} onChange={(e) => {
                    const val = e.target.value;
                    setProductForm(prev => {
                        const newState = { ...prev, profit_percentage: val };
                        if (val && prev.cost) {
                            const venta = Math.round(parseFloat(prev.cost) * (1 + parseFloat(val) / 100));
                            newState.original_price = venta.toString();
                            newState.price_with_iva = roundIvaPrice(Math.round(venta * 1.19)).toString();
                        }
                        return newState;
                    });
                  }} 
                  onBlur={(e) => harmonizePrice('profit_percentage', e.target.value)}
                  placeholder="Ej: 20" className="block w-full rounded-lg border-blue-200 px-4 py-2.5 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10 font-bold" />
                  <span className="absolute inset-y-0 right-3 flex items-center text-blue-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-tight">Valor Venta (COP)</label>
                <input type="number" name="original_price" value={productForm.original_price} onChange={(e) => {
                  const val = e.target.value;
                    setProductForm(prev => {
                      const newState = { ...prev, original_price: val };
                      if (val) {
                        const ventaNum = parseFloat(val);
                        newState.price_with_iva = roundIvaPrice(Math.round(ventaNum * 1.19)).toString();
                        
                        // Bidirectional: Recalculate profit percentage
                        if (prev.cost && parseFloat(prev.cost) > 0) {
                          const costNum = parseFloat(prev.cost);
                          const gainPct = ((ventaNum / costNum) - 1) * 100;
                          newState.profit_percentage = gainPct.toFixed(2);
                        }
                      } else {
                        newState.price_with_iva = '';
                        newState.profit_percentage = '';
                      }
                      return newState;
                    });
                  }} 
                  onBlur={(e) => harmonizePrice('original_price', e.target.value)}
                  placeholder="0" className="block w-full rounded-lg border-blue-200 px-4 py-2.5 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-bold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-tight">Valor Final + IVA (19%) - Lectura</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">$</span>
                <input type="number" name="price_with_iva" value={productForm.price_with_iva} readOnly className="block w-full rounded-lg border-slate-200 pl-8 pr-4 py-2.5 bg-slate-100 text-slate-500 shadow-inner sm:text-sm font-mono cursor-not-allowed" />
              </div>
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

{isDeleteModalOpen && productToDelete && (<div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"><div className="p-6 flex items-start gap-4"><div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-3xl">warning</span></div><div><h2 className="text-xl font-bold text-slate-900">Eliminar Producto</h2><p className="text-slate-600 mt-2">¿Estás seguro de que quieres eliminar "<strong>{productToDelete?.name}</strong>"? Esta acción es irreversible.</p></div></div><div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3"><button onClick={closeDeleteModal} type="button" className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50">Cancelar</button><button onClick={handleConfirmDelete} disabled={isDeleting} type="button" className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md disabled:bg-red-600/50 disabled:cursor-not-allowed transition-all">{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</button></div></div></div>)}

      {/* Modal de Progreso/Procesamiento */}
      {isProcessingImport && (
        <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">upload_file</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Procesando Archivo</h3>
            <p className="text-slate-500 mb-6 text-sm">Estamos analizando y validando la información de los productos...</p>
            
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out" 
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>{importProgress}% completado</span>
              <span>{bulkImportData.length} productos detectados</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Carga Masiva (Preview) */}
      {isShowImportPreview && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl">fact_check</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">Confirmación de Carga</h2>
                  <p className="text-sm text-slate-500 mt-1">Revisa los detalles antes de subir al sistema.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="block text-xl font-bold text-emerald-600 leading-tight">
                    {processedBulkData.filter(p => !p._incomplete).length}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Correctos</span>
                </div>
                <div className="text-center px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="block text-xl font-bold text-amber-600 leading-tight">
                    {processedBulkData.filter(p => p._incomplete).length}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Incompletos</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0 custom-scrollbar bg-slate-50">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bodega Principal / Aux</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio USD / COP</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio + IVA</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock P / A / T</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {processedBulkData.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors bg-white">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 font-mono">
                        {p.sku || <span className="text-red-500 italic">SIN SKU</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900 line-clamp-1">{p.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold text-indigo-600 uppercase">P: {p._warehouseName}</span>
                          {p.auxiliary_warehouse_id && <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">A: {p.auxiliary_warehouse_id}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">${formatCurrency(p.original_price)} COP</div>
                        {p.price_usd && <div className="text-[10px] font-medium text-emerald-600">(${formatCurrency(p.price_usd)} USD)</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-primary">${formatCurrency(p.price_with_iva)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-slate-900">{p.main_warehouse_stock} / {p.auxiliary_warehouse_stock}</span>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Total: {p.stock_quantity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p._errorFields.map((f: string, i: number) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${f === 'Agregar imagen' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{f}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4">
              {processedBulkData.some(p => p._incomplete) && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-600">warning</span>
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Hay productos con información faltante. Se cargarán en el sistema y aparecerán resaltados en rojo para que los completes manualmente.
                  </p>
                </div>
              )}
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsShowImportPreview(false)} 
                  className="flex-1 px-6 py-4 border border-slate-200 bg-white text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all font-display shadow-sm"
                >
                  Cancelar Cargue
                </button>
                <button 
                  onClick={async () => {
                    await finalizeImport(processedBulkData);
                  }}
                  className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl text-base font-bold hover:bg-blue-600 transition-all shadow-xl shadow-primary/30 font-display flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-2xl">publish</span>
                  Confirmar y Subir {processedBulkData.length} Productos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
