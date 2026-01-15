'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatOrderId } from '@/lib/utils';
import { colombiaData } from '@/lib/colombia-data';

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
  photo_url: string | null;
  client_type: 'Natural' | 'Empresa';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_urls: string | null;
  stock_quantity: number;
}

interface OrderItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: number;
  created_at: string;
  client_id: string;
  total_amount: number;
  status: string;
  shipping_address: any;
  clients?: Client;
  order_items?: {
    quantity: number;
    price_at_purchase: number;
    products: Product;
  }[];
}

function AdminOrdersPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
  const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Client search states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);

  // Order form states
  const [orderForm, setOrderForm] = useState({
    contact_phone: '',
    contact_email: '',
    shipping_department: '',
    shipping_municipality: '',
    shipping_address: ''
  });

  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('id');
  const shouldCreate = searchParams.get('create') === 'true';
  const clientIdFromUrl = searchParams.get('clientId');

  // Fetch orders and handle URL parameters
  useEffect(() => {
    fetchOrders();
    
    if (orderIdFromUrl) {
      setSelectedOrderId(parseInt(orderIdFromUrl));
    }

    if (shouldCreate) {
      setIsCreateModalOpen(true);
      if (clientIdFromUrl) {
        handlePreSelectClient(clientIdFromUrl);
      }
    }
  }, [orderIdFromUrl, shouldCreate, clientIdFromUrl]);

  const handlePreSelectClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (data && !error) {
        setSelectedClient(data);
        setClientSearchTerm(data.document_number || '');
        setOrderForm({
          contact_phone: data.phone || '',
          contact_email: data.email || '',
          shipping_department: data.department || '',
          shipping_municipality: data.municipality || '',
          shipping_address: data.address || ''
        });
      }
    } catch (err) {
      console.error('Error pre-selecting client:', err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch items for selected order
  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderItems(selectedOrderId);
    } else {
      setSelectedOrderItems([]);
    }
  }, [selectedOrderId]);

  // Handle status menu click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setIsContactMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced real-time client search by document
  useEffect(() => {
    // Avoid searching if we already have this client selected
    if (selectedClient && selectedClient.document_number === clientSearchTerm.trim()) {
      return;
    }

    if (!clientSearchTerm.trim()) {
      setSelectedClient(null);
      return;
    }

    const timer = setTimeout(() => {
      handleClientDocumentSearch(clientSearchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [clientSearchTerm, selectedClient]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          clients (
            id,
            full_name,
            company_name,
            email,
            phone,
            document_type,
            document_number,
            client_type,
            photo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: number) => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price_at_purchase,
          products (*)
        `)
        .eq('order_id', orderId);

      if (error) throw error;
      setSelectedOrderItems(data || []);
    } catch (error: any) {
      console.error('Error fetching order items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setIsStatusMenuOpen(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleEditOpen = () => {
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    if (!selectedOrder) return;

    setIsEditMode(true);
    setSelectedClient(selectedOrder.clients || null);
    setClientSearchTerm(selectedOrder.clients?.document_number || '');
    
    setOrderForm({
      contact_phone: selectedOrder.shipping_address?.phone || '',
      contact_email: selectedOrder.shipping_address?.email || '',
      shipping_department: selectedOrder.shipping_address?.department || '',
      shipping_municipality: selectedOrder.shipping_address?.municipality || '',
      shipping_address: selectedOrder.shipping_address?.address || ''
    });

    const mappedProducts: OrderItem[] = selectedOrderItems.map(item => ({
      product: item.products,
      quantity: item.quantity,
      unit_price: item.price_at_purchase
    }));
    
    setSelectedProducts(mappedProducts);
    setIsCreateModalOpen(true);
  };

  // Filtering
  const filteredOrders = orders.filter(order => {
    const searchStr = searchTerm.toLowerCase();
    const formattedId = formatOrderId(order.id).toLowerCase();
    
    const matchesSearch = 
      order.id.toString().includes(searchStr) ||
      formattedId.includes(searchStr) ||
      (order.clients?.full_name?.toLowerCase().includes(searchStr)) ||
      (order.clients?.company_name?.toLowerCase().includes(searchStr)) ||
      (order.clients?.email?.toLowerCase().includes(searchStr));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length);

  // Metrics
  const metrics = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pendiente').length,
    revenue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  };

  // Fetch clients for search
  const fetchClients = async (search: string = '') => {
    try {
      let query = supabase.from('clients').select('*');
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,document_number.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  };

  // Fetch products for search
  const fetchProducts = async (search: string = '') => {
    try {
      let query = supabase.from('products').select('*').eq('status', 'Activo');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle client document search (auto-fill)
  const handleClientDocumentSearch = async (document: string) => {
    if (!document.trim()) {
      setSelectedClient(null);
      return;
    }

    try {
      setSearchingClient(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('document_number', document.trim())
        .single();

      if (data && !error) {
        setSelectedClient(data);
        setOrderForm({
          contact_phone: data.phone || '',
          contact_email: data.email || '',
          shipping_department: data.department || '',
          shipping_municipality: data.municipality || '',
          shipping_address: data.address || ''
        });
      } else {
        // Only clear if search term is empty or definitely no match
        // But maybe keep current form to allow manual entry if needed?
        // For now, let's keep it simple: if no match, don't auto-fill
      }
    } catch (error: any) {
      // Ignore errors (like no match found)
    } finally {
      setSearchingClient(false);
    }
  };

  // Handle client selection from modal
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setOrderForm({
      contact_phone: client.phone || '',
      contact_email: client.email || '',
      shipping_department: client.department || '',
      shipping_municipality: client.municipality || '',
      shipping_address: client.address || ''
    });
    setIsClientSearchModalOpen(false);
    setClientSearchTerm(client.document_number || '');
  };

  // Handle product selection
  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => 
        p.product.id === product.id 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product,
        quantity: 1,
        unit_price: product.price
      }]);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
    } else {
      const product = selectedProducts.find(p => p.product.id === productId);
      if (product && quantity > product.product.stock_quantity) {
        alert(`Solo hay ${product.product.stock_quantity} unidades disponibles de ${product.product.name}`);
        return;
      }
      setSelectedProducts(selectedProducts.map(p =>
        p.product.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  // Calculate total
  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  // Handle submit order (Create or Update)
  const handleSubmitOrder = async () => {
    if (!selectedClient) {
      alert('Por favor selecciona un cliente');
      return;
    }

    if (selectedProducts.length === 0) {
      alert('Por favor agrega al menos un producto');
      return;
    }

    try {
      setIsSubmitting(true);
      const total = calculateTotal();
      const shippingAddress = {
        phone: orderForm.contact_phone,
        email: orderForm.contact_email,
        department: orderForm.shipping_department,
        municipality: orderForm.shipping_municipality,
        address: orderForm.shipping_address
      };

      let orderId: number;

      if (isEditMode && selectedOrderId) {
        // UPDATE EXISTING ORDER
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            client_id: selectedClient.id,
            total_amount: total,
            shipping_address: shippingAddress
          })
          .eq('id', selectedOrderId);

        if (orderError) throw orderError;
        orderId = selectedOrderId;

        // Manage Order Items for Update:
        // 1. Get previous items to restore stock
        const { data: oldItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (oldItems && oldItems.length > 0) {
          // Restore stock in parallel
          await Promise.all(oldItems.map(async (item) => {
            const { data: product } = await supabase
              .from('products')
              .select('stock_quantity')
              .eq('id', item.product_id)
              .single();
            
            if (product) {
              await supabase
                .from('products')
                .update({ stock_quantity: product.stock_quantity + item.quantity })
                .eq('id', item.product_id);
            }
          }));
        }

        // 2. Delete existing items
        await supabase.from('order_items').delete().eq('order_id', orderId);

      } else {
        // CREATE NEW ORDER
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{
            client_id: selectedClient.id,
            total_amount: total,
            status: 'Pendiente',
            shipping_address: shippingAddress
          }])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderData.id;

        // NEW: Update client status to 'Activo' if it's new order
        await supabase
          .from('clients')
          .update({ status: 'Activo' })
          .eq('id', selectedClient.id);
      }

      // Create/Re-insert order items
      const orderItems = selectedProducts.map(item => ({
        order_id: orderId,
        product_id: parseInt(item.product.id),
        quantity: item.quantity,
        price_at_purchase: item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock quantities (deduct new quantities) in parallel
      await Promise.all(selectedProducts.map(async (item) => {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', parseInt(item.product.id))
          .single();

        if (product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: product.stock_quantity - item.quantity 
            })
            .eq('id', parseInt(item.product.id));

          if (stockError) console.error('Error updating stock:', stockError);
        }
      }));

      // Reset and close
      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setSelectedClient(null);
      setSelectedProducts([]);
      setClientSearchTerm('');
      setOrderForm({
        contact_phone: '',
        contact_email: '',
        shipping_department: '',
        shipping_municipality: '',
        shipping_address: ''
      });
      
      await Promise.all([
        fetchOrders(),
        isEditMode ? fetchOrderItems(orderId) : Promise.resolve()
      ]);
      
    } catch (error: any) {
      console.error('Error saving order:', error);
      alert(`Error al guardar el pedido: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">Gestión de Pedidos</h2>
          <p className="text-slate-500 text-sm font-display">Administra y rastrea pedidos de equipos de telecomunicaciones.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditMode(false);
            setSelectedClient(null);
            setSelectedProducts([]);
            setOrderForm({
              contact_phone: '',
              contact_email: '',
              shipping_department: '',
              shipping_municipality: '',
              shipping_address: ''
            });
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-primary/30 font-display"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Crear Pedido</span>
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Total Pedidos</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">{metrics.total.toLocaleString()}</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">receipt_long</span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Pendientes</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">{metrics.pending.toLocaleString()}</p>
                </div>
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Ingresos Total</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">${formatCurrency(metrics.revenue)}</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                </span>
              </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 placeholder-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-display" 
                    placeholder="Buscar por ID, cliente o email..." 
                    type="text"
                  />
                </div>
                
                <div className="relative">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-[0_2px_4px_rgba(0,0,0,0.05)] font-display pr-10"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Procesando">Procesando</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">ID Pedido</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Cliente</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell font-display">Fecha</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display text-right">Total</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Estado</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-display"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="size-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-sm font-medium font-display">Cargando pedidos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 font-display">
                          No se encontraron pedidos
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => (
                        <tr 
                          key={order.id} 
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedOrderId === order.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                        >
                          <td className="p-4">
                            <span className="font-bold text-primary group-hover:underline font-display">{formatOrderId(order.id)}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 font-display">{order.clients?.full_name || order.clients?.company_name || 'Sin nombre'}</span>
                              <span className="text-xs text-slate-500 font-display">{order.clients?.email || 'Sin correo'}</span>
                            </div>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className="text-sm text-slate-600 font-display">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-slate-900 font-display">
                              ${formatCurrency(order.total_amount)}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display border ${
                              order.status === 'Completado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              order.status === 'Enviado' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                              order.status === 'Procesando' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              order.status === 'Cancelado' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                order.status === 'Completado' ? 'bg-emerald-500' :
                                order.status === 'Enviado' ? 'bg-indigo-500' :
                                order.status === 'Procesando' ? 'bg-blue-500' :
                                order.status === 'Cancelado' ? 'bg-red-500' :
                                'bg-amber-500'
                              }`}></span>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                              <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* PAGINATION ROW AT THE END OF TABLE */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Anterior
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700 font-display">
                      Mostrando <span className="font-bold text-slate-900">{filteredOrders.length > 0 ? startItem : 0}</span> a <span className="font-bold text-slate-900">{endItem}</span> de <span className="font-bold text-slate-900">{filteredOrders.length}</span> resultados
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1} 
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                      </button>
                      {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(page => (
                        <button 
                          key={page} 
                          onClick={() => setCurrentPage(page)} 
                          aria-current={currentPage === page ? 'page' : undefined} 
                          className={`${currentPage === page 
                            ? 'z-10 bg-primary/10 border-primary text-primary font-bold' 
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'} relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors font-display`}
                        >
                          {page}
                        </button>
                      ))}
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages || totalPages === 0} 
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* SIDEBAR - Order Details */}
        <aside className="w-[450px] border-l border-slate-200 bg-white flex-col hidden 2xl:flex overflow-y-auto">
          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">receipt_long</span>
              <p className="text-slate-500 font-display">Selecciona un pedido para ver sus detalles.</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Resumen del Pedido</span>
                  <h3 className="text-xl font-bold text-slate-900 font-display mt-0.5">{formatOrderId(selectedOrder.id)}</h3>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                  selectedOrder.status === 'Completado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  selectedOrder.status === 'Enviado' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                  selectedOrder.status === 'Procesando' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  selectedOrder.status === 'Cancelado' ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {selectedOrder.status}
                </div>
              </div>

              <div className="p-6 space-y-8 flex-1">
                {/* Client Profile */}
                <div className="flex items-center gap-4">
                  {selectedOrder.clients?.photo_url && (selectedOrder.clients.photo_url.startsWith('http') || selectedOrder.clients.photo_url.startsWith('/')) ? (
                    <div className="size-16 relative rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                      <Image 
                        src={selectedOrder.clients.photo_url} 
                        alt={selectedOrder.clients.full_name || ''} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                      <span className="material-symbols-outlined text-3xl">person</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-slate-900 font-display leading-tight">
                      {selectedOrder.clients?.full_name || 'Sin nombre'}
                    </h4>
                    {selectedOrder.clients?.client_type === 'Empresa' && selectedOrder.clients?.company_name && (
                      <p className="text-sm text-slate-500 font-display flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-sm">business</span>
                        {selectedOrder.clients.company_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Celular</p>
                    <p className="text-sm font-bold text-slate-900 font-display break-all">
                      {selectedOrder.clients?.phone || 'No registrado'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Correo</p>
                    <p className="text-sm font-bold text-slate-900 font-display break-all">
                      {selectedOrder.clients?.email || 'No registrado'}
                    </p>
                  </div>
                </div>

                {/* Shipping Info */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-relaxed mb-3 font-display">Información de Envío</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-sm mt-0.5">location_on</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-display leading-snug">
                          {selectedOrder.shipping_address?.address || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500 font-display mt-0.5">
                          {selectedOrder.shipping_address?.municipality}, {selectedOrder.shipping_address?.department}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-relaxed mb-3 font-display">Detalle de Compra</h4>
                  <div className="space-y-3">
                    {loadingItems ? (
                      <div className="p-4 text-center text-slate-400 text-sm">Cargando productos...</div>
                    ) : selectedOrderItems.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">No hay productos registrados</div>
                    ) : (
                      selectedOrderItems.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <div className="size-11 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm relative overflow-hidden group">
                            {item.products?.image_urls?.split(',')[0]?.trim() && (item.products.image_urls.split(',')[0].trim().startsWith('http') || item.products.image_urls.split(',')[0].trim().startsWith('/')) ? (
                              <Image src={item.products.image_urls.split(',')[0].trim()} alt={item.products.name} fill className="object-cover" />
                            ) : (
                              <span className="material-symbols-outlined">inventory_2</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate font-display">{item.products?.name || 'Producto desconocido'}</p>
                            <p className="text-xs text-slate-500 font-display">{item.quantity} x ${formatCurrency(item.price_at_purchase)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 font-display">
                              ${formatCurrency(item.quantity * item.price_at_purchase)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">Total</span>
                      <span className="text-xl font-black text-primary font-display">${formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="relative col-span-2" ref={contactMenuRef}>
                    <button 
                      onClick={() => setIsContactMenuOpen(!isContactMenuOpen)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-emerald-200 font-display"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                      <span>Contactar Cliente</span>
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </button>
                    {isContactMenuOpen && (
                      <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        <button
                          onClick={() => {
                            const phone = selectedOrder.clients?.phone;
                            if (phone) window.open(`https://wa.me/57${phone.replace(/\D/g, '')}`, '_blank');
                            else alert('No hay teléfono registrado');
                            setIsContactMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-slate-100"
                        >
                          <span className="material-symbols-outlined text-[20px]">chat</span>
                          WhatsApp ({selectedOrder.clients?.phone || 'Sin número'})
                        </button>
                        <button
                          onClick={() => {
                            const email = selectedOrder.clients?.email;
                            if (email) window.open(`mailto:${email}`, '_blank');
                            else alert('No hay correo registrado');
                            setIsContactMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">mail</span>
                          Correo ({selectedOrder.clients?.email || 'Sin correo'})
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={statusMenuRef}>
                    <button 
                      onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                      className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3.5 rounded-xl font-bold text-sm transition-all shadow-sm font-display"
                    >
                      <span className="material-symbols-outlined text-[20px]">sync</span>
                      <span>Estado</span>
                    </button>
                    {isStatusMenuOpen && (
                      <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                        {['Pendiente', 'Procesando', 'Enviado', 'Completado', 'Cancelado'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${selectedOrder.status === status ? 'text-primary bg-primary/5' : 'text-slate-600'}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleEditOpen}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3.5 rounded-xl font-bold text-sm transition-all shadow-sm font-display"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* CREATE/EDIT ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-slate-900 font-display">{isEditMode ? `Editar Pedido ${formatOrderId(selectedOrderId)}` : 'Crear Nuevo Pedido'}</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* CLIENT SEARCH SECTION */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 font-display">Buscar Cliente</h3>
                <div className="flex gap-3 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Número de documento..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display ${searchingClient ? 'pr-10' : ''}`}
                    />
                    {searchingClient && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      fetchClients();
                      setIsClientSearchModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors font-display flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">search</span>
                    Buscar
                  </button>
                </div>
              </div>

              {selectedClient && (
                <>
                  {/* CLIENT DATA */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">Datos del Cliente</h4>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <label className="text-xs text-slate-500 font-display">Nombre</label>
                        <p className="font-medium text-slate-900 font-display">{selectedClient.full_name || selectedClient.company_name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-display">Documento</label>
                        <p className="font-medium text-slate-900 font-display">{selectedClient.document_type}: {selectedClient.document_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* CONTACT DATA */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">Datos de Contacto</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 font-display">Teléfono</label>
                        <input
                          type="text"
                          value={orderForm.contact_phone}
                          onChange={(e) => setOrderForm({...orderForm, contact_phone: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 font-display">Email</label>
                        <input
                          type="email"
                          value={orderForm.contact_email}
                          onChange={(e) => setOrderForm({...orderForm, contact_email: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SHIPPING DATA */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider font-display">Datos de Envío</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 font-display">Departamento</label>
                        <select
                          value={orderForm.shipping_department}
                          onChange={(e) => setOrderForm({...orderForm, shipping_department: e.target.value, shipping_municipality: ''})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display"
                        >
                          <option value="">Seleccionar...</option>
                          {Object.keys(colombiaData).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 font-display">Municipio</label>
                        <select
                          value={orderForm.shipping_municipality}
                          onChange={(e) => setOrderForm({...orderForm, shipping_municipality: e.target.value})}
                          disabled={!orderForm.shipping_department}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display disabled:bg-slate-100"
                        >
                          <option value="">Seleccionar...</option>
                          {orderForm.shipping_department && colombiaData[orderForm.shipping_department]?.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-slate-700 font-display">Dirección</label>
                        <input
                          type="text"
                          value={orderForm.shipping_address}
                          onChange={(e) => setOrderForm({...orderForm, shipping_address: e.target.value})}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* PRODUCTS SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 font-display">Productos</h3>
                  <button
                    onClick={() => {
                      fetchProducts();
                      setIsProductSearchModalOpen(true);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg font-bold transition-colors font-display flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Agregar Productos
                  </button>
                </div>

                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    {selectedProducts.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 font-display">{item.product.name}</p>
                          <p className="text-xs text-slate-500 font-display">
                            SKU: {item.product.sku} | Disponible: <span className="font-bold text-slate-700">{item.product.stock_quantity}</span> unidades
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                            className="size-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                          >
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </button>
                          <span className="w-12 text-center font-bold font-display">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                            className="size-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 font-display">${formatCurrency(item.unit_price * item.quantity)}</p>
                          <p className="text-xs text-slate-500 font-display">${formatCurrency(item.unit_price)} c/u</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <div className="text-right">
                        <p className="text-sm text-slate-500 font-display">Total</p>
                        <p className="text-2xl font-bold text-slate-900 font-display">${formatCurrency(calculateTotal())}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors font-display"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={!selectedClient || selectedProducts.length === 0 || isSubmitting}
                  className="px-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-bold transition-all font-display disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {isSubmitting ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Pedido')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT SEARCH MODAL */}
      {isClientSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 font-display">Seleccionar Cliente</h3>
              <button onClick={() => setIsClientSearchModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={productSearchTerm}
                onChange={(e) => {
                  setProductSearchTerm(e.target.value);
                  fetchClients(e.target.value);
                }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display mb-4"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <p className="font-bold text-slate-900 font-display">{client.full_name || client.company_name}</p>
                    <p className="text-sm text-slate-500 font-display">{client.document_type}: {client.document_number}</p>
                    <p className="text-sm text-slate-500 font-display">{client.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT SEARCH MODAL */}
      {isProductSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 font-display">Seleccionar Productos</h3>
              <button onClick={() => setIsProductSearchModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={productSearchTerm}
                onChange={(e) => {
                  setProductSearchTerm(e.target.value);
                  fetchProducts(e.target.value);
                }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-display mb-4"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-2">
                {products.map((product) => {
                  const isOutOfStock = product.stock_quantity <= 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (!isOutOfStock) {
                          handleAddProduct(product);
                          setIsProductSearchModalOpen(false);
                        }
                      }}
                      className={`p-4 border rounded-lg flex items-center gap-4 transition-colors ${
                        isOutOfStock 
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' 
                          : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold font-display ${
                            isOutOfStock ? 'text-slate-400' : 'text-slate-900'
                          }`}>
                            {product.name}
                          </p>
                          {isOutOfStock && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full font-display">
                              Sin Stock
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-display">
                          SKU: {product.sku} | Stock: <span className={`font-bold ${
                            product.stock_quantity <= 5 ? 'text-red-600' : 'text-slate-700'
                          }`}>{product.stock_quantity}</span> unidades
                        </p>
                      </div>
                      <p className={`font-bold font-display ${
                        isOutOfStock ? 'text-slate-400' : 'text-primary'
                      }`}>
                        ${formatCurrency(product.price)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="size-10 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
      </div>
    }>
      <AdminOrdersPageContent />
    </Suspense>
  );
}
