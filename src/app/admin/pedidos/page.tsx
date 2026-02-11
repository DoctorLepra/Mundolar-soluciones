'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notifyAdmins } from '@/lib/notifications';
import { formatCurrency, formatOrderId } from '@/lib/utils';
import { colombiaData } from '@/lib/colombia-data';

interface Warehouse {
  id: string;
  name: string;
}

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

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_urls: string | null;
  stock_quantity: number;
  warehouse_id: string | null;
  auxiliary_warehouse_id: string | null;
  main_warehouse_stock: number;
  auxiliary_warehouse_stock: number;
}

interface OrderItem {
  product: Product;
  quantity: number;
  unit_price: number;
  selected_warehouse_id?: string | null;
}

interface Order {
  id: number;
  created_at: string;
  client_id: string;
  total_amount: number;
  status: string;
  shipping_address: any;
  subtotal?: number;
  discount_percentage?: number;
  clients?: Client;
  order_items?: {
    quantity: number;
    price_at_purchase: number;
    products: Product;
  }[];
  created_by_id?: string | null;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

// Main Content Component
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
    shipping_address: '',
    discount_percentage: '0'
  });

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Multibodega states
  const [isWarehouseSwitchModalOpen, setIsWarehouseSwitchModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams.get('id');
  const shouldCreate = searchParams.get('create') === 'true';
  const clientIdFromUrl = searchParams.get('clientId');

  // Fetch orders and handle URL parameters
  useEffect(() => {
    fetchOrders();
    fetchWarehouses();
    fetchUserProfile();
    
    if (orderIdFromUrl) {
      setSelectedOrderId(parseInt(orderIdFromUrl));
    }

    if (shouldCreate) {
      const fromQuote = searchParams.get('fromQuote');
      if (fromQuote) {
        handleLoadFromQuote(fromQuote);
      } else if (clientIdFromUrl) {
        handlePreSelectClient(clientIdFromUrl);
      }
      setIsCreateModalOpen(true);
    }

    // Realtime subscription for orders
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', table: 'orders', schema: 'public' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [orderIdFromUrl, shouldCreate, clientIdFromUrl, searchParams]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleLoadFromQuote = async (quoteId: string) => {
    try {
      setLoadingItems(true);
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, clients(*)')
        .eq('id', quoteId)
        .single();
      
      if (quoteError || !quote) throw quoteError;

      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('*, products(*)')
        .eq('quote_id', quoteId);
      
      if (itemsError) throw itemsError;

      setSelectedClient(quote.clients);
      setClientSearchTerm(quote.clients.document_number || quote.clients.nit || '');
      setOrderForm({
        contact_phone: quote.clients.phone || '',
        contact_email: quote.clients.email || '',
        shipping_department: quote.clients.department || '',
        shipping_municipality: quote.clients.municipality || '',
        shipping_address: quote.clients.address || '',
        discount_percentage: (quote.discount_percentage || 0).toString()
      });

      if (items) {
        const mappedProducts: OrderItem[] = items.map(item => ({
          product: item.products,
          quantity: item.quantity,
          unit_price: item.unit_price,
          selected_warehouse_id: item.products.warehouse_id
        }));
        setSelectedProducts(mappedProducts);
      }
    } catch (err) {
      console.error('Error loading from quote:', err);
      alert('Error al cargar datos de la cotización');
    } finally {
      setLoadingItems(false);
    }
  };

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
          shipping_address: data.address || '',
          discount_percentage: '0'
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
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase.from('profiles').select('role').eq('id', user.id).single() : { data: null };

      let query = supabase
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
          ),
          profiles:created_by_id (full_name, role)
        `);

      if (profile && profile.role === 'Vendedor') {
        query = query.eq('created_by_id', user!.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase.from('warehouses').select('id, name');
      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
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
          products (*),
          warehouse_id
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
      shipping_address: selectedOrder.shipping_address?.address || '',
      discount_percentage: (selectedOrder.discount_percentage || 0).toString()
    });

    const mappedProducts: OrderItem[] = (selectedOrderItems || []).map(item => ({
      product: item.products,
      quantity: item.quantity,
      unit_price: item.price_at_purchase,
      selected_warehouse_id: item.warehouse_id
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
    revenue: orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
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
      let query = supabase.from('products').select(`
        *,
        brands (name)
      `).eq('status', 'Activo');
      
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
          shipping_address: data.address || '',
          discount_percentage: '0'
        });
      }
    } catch (error: any) {
      // Ignore errors
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
      shipping_address: client.address || '',
      discount_percentage: '0'
    });
    setIsClientSearchModalOpen(false);
    setClientSearchTerm(client.document_number || '');
  };

  // Handle product selection
  const handleAddProduct = (product: Product) => {
    // 1. Check primary warehouse stock
    if (product.main_warehouse_stock > 0) {
      addOrUpdateProduct(product, product.warehouse_id);
    } 
    // 2. Check auxiliary warehouse stock if primary is empty
    else if (product.auxiliary_warehouse_stock > 0) {
      setPendingProduct(product);
      setIsWarehouseSwitchModalOpen(true);
    } 
    // 3. No stock in either warehouse
    else {
      alert(`No hay stock disponible para ${product.name} en ninguna de las bodegas asignadas.`);
    }
  };

  const addOrUpdateProduct = (product: Product, warehouseId: string | null) => {
    const existing = selectedProducts.find(p => p.product.id === product.id && p.selected_warehouse_id === warehouseId);
    if (existing) {
      // Check stock in selected warehouse
      const currentStock = warehouseId === product.warehouse_id ? product.main_warehouse_stock : product.auxiliary_warehouse_stock;
      if (existing.quantity + 1 > (currentStock || 0)) {
        alert(`No hay suficiente stock en la bodega de ${warehouseId === product.warehouse_id ? 'Principal' : 'Auxiliar'}. Stock disponible: ${currentStock}`);
        return;
      }

      setSelectedProducts(selectedProducts.map(p => 
        (p.product.id === product.id && p.selected_warehouse_id === warehouseId)
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product,
        quantity: 1,
        unit_price: product.price,
        selected_warehouse_id: warehouseId
      }]);
    }
    setIsWarehouseSwitchModalOpen(false);
    setPendingProduct(null);
  };

  // Handle quantity change
  const handleQuantityChange = (productId: string, quantity: number, warehouseId?: string | null) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => !(p.product.id === productId && p.selected_warehouse_id === warehouseId)));
    } else {
      const item = selectedProducts.find(p => p.product.id === productId && p.selected_warehouse_id === warehouseId);
      if (item) {
        const currentStock = item.selected_warehouse_id === item.product.warehouse_id 
          ? item.product.main_warehouse_stock 
          : item.product.auxiliary_warehouse_stock;
          
        if (quantity > (currentStock || 0)) {
          alert(`Solo hay ${currentStock} unidades disponibles en la bodega seleccionada`);
          return;
        }
        setSelectedProducts(selectedProducts.map(p =>
          (p.product.id === productId && p.selected_warehouse_id === warehouseId) ? { ...p, quantity } : p
        ));
      }
    }
  };

  const handleRemoveProduct = (productId: string, warehouseId?: string | null) => {
    setSelectedProducts(selectedProducts.filter(p => !(p.product.id === productId && p.selected_warehouse_id === warehouseId)));
  };

  // Calculate subtotal and total
  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = (subtotal * (parseFloat(orderForm.discount_percentage) || 0)) / 100;
    return subtotal - discount;
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
      const subtotal = calculateSubtotal();
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
            subtotal,
            discount_percentage: parseFloat(orderForm.discount_percentage),
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
          .select('product_id, quantity, warehouse_id')
          .eq('order_id', orderId);

        if (oldItems && oldItems.length > 0) {
          // Restore stock in parallel
          await Promise.all(oldItems.map(async (item) => {
            try {
              const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('stock_quantity, main_warehouse_stock, auxiliary_warehouse_stock, warehouse_id, auxiliary_warehouse_id')
                .eq('id', item.product_id)
                .single();
              
              if (fetchError) {
                console.error(`Error fetching product ${item.product_id} for restoration:`, fetchError);
                return;
              }

              if (product) {
                const isMain = item.warehouse_id === product.warehouse_id;
                const isAux = item.warehouse_id === product.auxiliary_warehouse_id;
                
                const updateData: any = {
                  stock_quantity: (product.stock_quantity || 0) + item.quantity
                };
                
                if (isMain) {
                  updateData.main_warehouse_stock = (product.main_warehouse_stock || 0) + item.quantity;
                } else if (isAux) {
                  updateData.auxiliary_warehouse_stock = (product.auxiliary_warehouse_stock || 0) + item.quantity;
                }
                
                const { error: restoreError } = await supabase
                  .from('products')
                  .update(updateData)
                  .eq('id', item.product_id);

                if (restoreError) console.error(`Error restoring stock for product ${item.product_id}:`, restoreError);
              }
            } catch (err) {
              console.error('Unexpected error in stock restoration:', err);
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
            subtotal,
            discount_percentage: parseFloat(orderForm.discount_percentage),
            total_amount: total,
            status: 'Pendiente',
            shipping_address: shippingAddress,
            created_by_id: currentUserProfile?.id
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
        price_at_purchase: item.unit_price,
        warehouse_id: item.selected_warehouse_id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Notification Logic
      if (currentUserProfile?.role === 'Vendedor') {
        const { data: { user } } = await supabase.auth.getUser();
        await notifyAdmins({
          title: 'Nuevo Pedido Registrado',
          message: `El vendedor ${currentUserProfile.full_name} ha creado un nuevo pedido.`,
          type: 'order',
          related_id: orderId.toString()
        });
      }

      // Update product stock quantities (deduct new quantities) in parallel
      const stockUpdateResults = await Promise.all(selectedProducts.map(async (item) => {
        try {
          const productId = parseInt(item.product.id.toString());
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity, main_warehouse_stock, auxiliary_warehouse_stock, warehouse_id, auxiliary_warehouse_id')
            .eq('id', productId.toString())
            .single();

          if (fetchError || !product) {
            console.error(`Error fetching product ${productId} for deduction:`, fetchError);
            return { success: false, productId, error: fetchError || 'No encontrado' };
          }

          const isMain = item.selected_warehouse_id === product.warehouse_id;
          const isAux = item.selected_warehouse_id === product.auxiliary_warehouse_id;
          
          const updateData: any = {
            stock_quantity: (product.stock_quantity || 0) - item.quantity
          };
          
          if (isMain) {
            updateData.main_warehouse_stock = (product.main_warehouse_stock || 0) - item.quantity;
          } else if (isAux) {
            updateData.auxiliary_warehouse_stock = (product.auxiliary_warehouse_stock || 0) - item.quantity;
          }

          const { error: stockError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

          if (stockError) {
            console.error(`Error updating stock for product ${productId}:`, stockError);
            return { success: false, productId, error: stockError };
          }
          return { success: true };
        } catch (err) {
          console.error('Unexpected error in stock deduction:', err);
          return { success: false, error: err };
        }
      }));

      const failedUpdates = stockUpdateResults.filter(r => !r.success);
      if (failedUpdates.length > 0) {
        console.warn(`${failedUpdates.length} actualizaciones de stock fallaron.`);
      }

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
        shipping_address: '',
        discount_percentage: '0'
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
              shipping_address: '',
              discount_percentage: '0'
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

        <aside 
          className={`bg-white border-l border-slate-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
            selectedOrder ? "w-full lg:w-[450px] opacity-100" : "w-0 opacity-0 border-none"
          }`}
        >
          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white lg:min-w-[450px]">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">receipt_long</span>
              <p className="text-slate-500 font-display">Selecciona un pedido para ver sus detalles.</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-full relative">
              {/* Botón de Cierre */}
              <button 
                onClick={() => setSelectedOrderId(null)}
                className="absolute top-6 right-6 size-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all z-20"
                title="Cerrar detalles"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>

              {/* Sidebar Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 pr-24">
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

                {/* Atribución / Vendedor */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-xl">person_check</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none mb-1">Vendedor Asignado</p>
                    <p className="text-sm font-bold text-emerald-900 font-display">
                      {selectedOrder.profiles?.full_name || 'Sistema'}
                    </p>
                    <p className="text-[10px] font-medium text-emerald-500 font-display">
                      {selectedOrder.profiles?.role || 'Admin'}
                    </p>
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
                            <p className="text-xs text-slate-500 font-display flex items-center gap-2">
                              {item.quantity} x ${formatCurrency(item.price_at_purchase)}
                              <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase">
                                {warehouses.find(w => w.id === item.warehouse_id)?.name || 'Bodega'}
                              </span>
                            </p>
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
                  {/* Read-only Warning */}
                  {(() => {
                    const canModify = currentUserProfile?.role === 'Admin' || selectedOrder?.created_by_id === currentUserProfile?.id;
                    if (!canModify) return (
                      <div className="col-span-2 mb-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
                        <p className="text-[11px] font-medium text-amber-700 font-display">
                          Solo el vendedor responsable o un administrador pueden realizar modificaciones.
                        </p>
                      </div>
                    );
                    return null;
                  })()}

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

                  {(() => {
                    const canModify = currentUserProfile?.role === 'Admin' || selectedOrder?.created_by_id === currentUserProfile?.id;
                    if (!canModify) return null;

                    return (
                      <>
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
                              {['Pendiente', 'Procesando', 'Enviado', 'Completado', 'Cancelada'].map((status) => (
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
                        </button>
                      </>
                    );
                  })()}
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
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th scope="col" className="relative px-4 py-3">
                            <span className="sr-only">Eliminar</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {selectedProducts.map((item, idx) => (
                          <tr key={`${item.product.id}-${item.selected_warehouse_id || idx}`}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <img
                                    className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                                    src={item.product.image_urls ? (JSON.parse(item.product.image_urls)[0] || '/placeholder.png') : '/placeholder.png'}
                                    alt={item.product.name}
                                    width={40}
                                    height={40}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-slate-900">{item.product.name}</div>
                                  <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                                    <span>SKU: {item.product.sku}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-primary font-bold">
                                      Bodega: {warehouses.find(w => w.id === item.selected_warehouse_id)?.name || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center border border-slate-200 rounded-lg w-fit overflow-hidden bg-white">
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.selected_warehouse_id)}
                                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">remove</span>
                                </button>
                                <div className="px-4 py-1 text-sm font-bold text-slate-900 min-w-[40px] text-center border-x border-slate-200">
                                  {item.quantity}
                                </div>
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.selected_warehouse_id)}
                                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">add</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <p className="font-bold text-slate-900 font-display">${formatCurrency(item.unit_price * item.quantity)}</p>
                              <p className="text-xs text-slate-500 font-display">${formatCurrency(item.unit_price)} c/u</p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveProduct(item.product.id, item.selected_warehouse_id)}
                                className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 mt-4">
                      <div className="flex justify-between items-center text-sm font-display">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-bold text-slate-900">${formatCurrency(calculateSubtotal())}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm font-display">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Descuento (%)</span>
                          <input 
                            type="number"
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-emerald-600 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={orderForm.discount_percentage}
                            onChange={(e) => setOrderForm({ ...orderForm, discount_percentage: e.target.value })}
                          />
                        </div>
                        <span className="font-bold text-emerald-600">-${formatCurrency((calculateSubtotal() * (parseFloat(orderForm.discount_percentage) || 0)) / 100)}</span>
                      </div>

                      <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-base font-bold text-slate-900 font-display">Total Final</span>
                        <span className="text-2xl font-black text-primary font-display">${formatCurrency(calculateTotal())}</span>
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
      {/* Modal de Cambio de Bodega */}
      {isWarehouseSwitchModalOpen && pendingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined">warehouse</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-display">Cambio de Bodega</h3>
              </div>
              <button 
                onClick={() => setIsWarehouseSwitchModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 leading-relaxed">
                  El stock en la <strong>Bodega Principal</strong> para "<strong>{pendingProduct.name}</strong>" está agotado.
                </p>
                <p className="text-sm text-amber-800 mt-2 font-medium">
                  Sin embargo, hay <strong>{pendingProduct.auxiliary_warehouse_stock} unidades</strong> disponibles en la <strong>Bodega Auxiliar</strong>.
                </p>
              </div>
              
              <div className="space-y-3 pt-2">
                <p className="text-sm font-bold text-slate-900">¿Deseas usar el stock de la Bodega Auxiliar?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsWarehouseSwitchModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    No, cancelar
                  </button>
                  <button
                    onClick={() => addOrUpdateProduct(pendingProduct, pendingProduct.auxiliary_warehouse_id)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                  >
                    Sí, usar Auxiliar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Exported Page with Suspense
export default function AdminOrdersPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <AdminOrdersPageContent />
    </React.Suspense>
  );
}
