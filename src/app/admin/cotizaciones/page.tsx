'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatQuoteId } from '@/lib/utils';

interface Client {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  client_type: 'Natural' | 'Empresa';
  nit: string | null;
  contact_person: string | null;
  position: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_urls: string | null;
  stock_quantity: number;
}

interface QuoteItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  quote_number: string;
  created_at: string;
  client_id: string;
  total_amount: number;
  subtotal: number;
  discount_percentage: number;
  status: string;
  observations: string | null;
  valid_until: string | null;
  clients?: Client;
}

function AdminQuotesPageContent() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
  const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Client search states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  
  // UI states for Sidebar
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  
  // Product search states
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<QuoteItem[]>([]);

  // Quote form states
  const [quoteForm, setQuoteForm] = useState({
    observations: '',
    discount_percentage: '0',
    valid_until: ''
  });

  const searchParams = useSearchParams();
  const quoteIdFromUrl = searchParams.get('id');

  useEffect(() => {
    fetchQuotes();
    if (quoteIdFromUrl) {
      setSelectedQuoteId(quoteIdFromUrl);
    }
  }, [quoteIdFromUrl]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedQuoteId) {
      fetchQuoteItems(selectedQuoteId);
    } else {
      setSelectedQuoteItems([]);
    }
  }, [selectedQuoteId]);

  // Handle dropdowns click outside
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

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          clients (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('quote_items')
        .select(`
          quantity,
          unit_price,
          products (*)
        `)
        .eq('quote_id', quoteId);

      if (error) throw error;
      setSelectedQuoteItems(data || []);
    } catch (error: any) {
      console.error('Error fetching quote items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchClients = async (search: string = '') => {
    try {
      let query = supabase.from('clients').select('*');
      if (search) {
        // Búsqueda más robusta incluyendo NIT y correo
        query = query.or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,document_number.ilike.%${search}%,nit.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query.limit(15);
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async (search: string = '') => {
    try {
      let query = supabase.from('products').select('*').eq('status', 'Activo');
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }
      const { data, error } = await query.limit(10);
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle client selection from modal
  // Auto-selección de cliente por documento/NIT en Cotizaciones
  useEffect(() => {
    const term = clientSearchTerm.trim();
    if (selectedClient && (selectedClient.document_number === term || selectedClient.nit === term)) {
      return;
    }

    if (!term || term.length < 6) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        console.log('Buscando cliente automáticamente por:', term);
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .or(`document_number.eq."${term}",nit.eq."${term}"`)
          .limit(1)
          .single();
        
        if (data && !error) {
          console.log('Cliente encontrado auto:', data);
          setSelectedClient(data);
        }
      } catch (err) {
        // Silenciosamente fallar si no hay coincidencia exacta
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [clientSearchTerm, selectedClient]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearchTerm(client.document_number || client.nit || '');
    setIsClientSearchModalOpen(false);
  };

  const [nextQuoteNumber, setNextQuoteNumber] = useState('COT-xxxx');

  useEffect(() => {
    const fetchNextNumber = async () => {
      const { data, error } = await supabase.rpc('get_next_quote_number');
      // If RPC doesn't exist yet, we'll just use a fallback or fetch last quote
      if (error) {
        const { data: lastQuote } = await supabase.from('quotes').select('quote_number').order('created_at', { ascending: false }).limit(1);
        if (lastQuote && lastQuote.length > 0) {
          const num = parseInt(lastQuote[0].quote_number.replace('COT-', '')) + 1;
          setNextQuoteNumber(`COT-${num.toString().padStart(4, '0')}`);
        } else {
          setNextQuoteNumber('COT-0001');
        }
      } else {
        setNextQuoteNumber(data);
      }
    };
    if (isCreateModalOpen) fetchNextNumber();
  }, [isCreateModalOpen]);

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity <= 0) {
      alert('Producto sin stock disponible');
      return;
    }
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.stock_quantity) {
        alert('No se puede exceder el stock disponible');
        return;
      }
      setSelectedProducts(selectedProducts.map(p => 
        p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product,
        quantity: 1,
        unit_price: product.price
      }]);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
    } else {
      const item = selectedProducts.find(p => p.product.id === productId);
      if (item && quantity > item.product.stock_quantity) {
        alert(`Solo hay ${item.product.stock_quantity} unidades disponibles`);
        return;
      }
      setSelectedProducts(selectedProducts.map(p =>
        p.product.id === productId ? { ...p, quantity } : p
      ));
    }
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = (subtotal * parseFloat(quoteForm.discount_percentage || '0')) / 100;
    return subtotal - discount;
  };

  const handleSubmitQuote = async () => {
    if (!selectedClient) {
      alert('Seleccione un cliente');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('Agregue al menos un producto');
      return;
    }

    try {
      setIsSubmitting(true);
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      let quoteId = selectedQuoteId;

      if (isEditMode && quoteId) {
        const { error: quoteUpdateError } = await supabase
          .from('quotes')
          .update({
            subtotal,
            discount_percentage: parseFloat(quoteForm.discount_percentage),
            total_amount: total,
            observations: quoteForm.observations,
            valid_until: quoteForm.valid_until || null
          })
          .eq('id', quoteId);

        if (quoteUpdateError) throw quoteUpdateError;

        // Delete old items
        const { error: deleteError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId);
        
        if (deleteError) throw deleteError;
      } else {
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            client_id: selectedClient.id,
            subtotal,
            discount_percentage: parseFloat(quoteForm.discount_percentage),
            total_amount: total,
            observations: quoteForm.observations,
            valid_until: quoteForm.valid_until || null,
            status: 'Pendiente'
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;
        quoteId = quoteData.id;
      }

      const items = selectedProducts.map(p => ({
        quote_id: quoteId,
        product_id: p.product.id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total_price: p.unit_price * p.quantity
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(items);
      if (itemsError) throw itemsError;

      setIsCreateModalOpen(false);
      setIsEditMode(false);
      setSelectedClient(null);
      setSelectedProducts([]);
      setQuoteForm({ observations: '', discount_percentage: '0', valid_until: '' });
      fetchQuotes();
      alert(isEditMode ? 'Cotización actualizada' : 'Cotización creada con éxito');
    } catch (error: any) {
      console.error('Error saving quote:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId);

      if (error) throw error;
      setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta cotización?')) return;
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;
      setQuotes(quotes.filter(q => q.id !== quoteId));
      setSelectedQuoteId(null);
      alert('Cotización eliminada');
    } catch (error: any) {
      console.error('Error deleting quote:', error);
      alert('Error al eliminar');
    }
  };

  const handleEditQuote = (quote: Quote) => {
    setSelectedClient(quote.clients || null);
    setClientSearchTerm(quote.clients?.document_number || quote.clients?.nit || '');
    setQuoteForm({
      observations: quote.observations || '',
      discount_percentage: quote.discount_percentage.toString(),
      valid_until: quote.valid_until || ''
    });
    
    if (selectedQuoteId === quote.id) {
      setSelectedProducts(selectedQuoteItems.map(item => ({
        product: item.products,
        quantity: item.quantity,
        unit_price: item.unit_price
      })));
    }
    
    setIsCreateModalOpen(true);
    setIsEditMode(true);
  };

  const filteredQuotes = quotes.filter(q => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = q.quote_number.toLowerCase().includes(search) || 
           q.clients?.full_name?.toLowerCase().includes(search) ||
           q.clients?.company_name?.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">Cotizaciones</h2>
          <p className="text-slate-500 text-sm font-display">Genera y administra presupuestos para clientes.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Crear Cotización
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pendientes', status: 'Pendiente', color: 'blue', icon: 'pending_actions' },
              { label: 'Aprobadas', status: 'Aprobada', color: 'emerald', icon: 'check_circle' },
              { label: 'Renovadas', status: 'Renovada', color: 'amber', icon: 'history' },
              { label: 'Canceladas', status: 'Cancelada', color: 'red', icon: 'cancel' }
            ].map((card) => {
              const count = quotes.filter(q => q.status === card.status).length;
              const colorClasses: any = {
                blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
                emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
                amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
                red: { bg: 'bg-red-50', text: 'text-red-600' }
              };
              return (
                <div 
                  key={card.status}
                  onClick={() => setStatusFilter(card.status)}
                  className={`bg-white p-5 rounded-xl border border-slate-200 flex items-start justify-between cursor-pointer transition-all hover:shadow-lg hover:border-primary/20 ${
                    statusFilter === card.status ? 'ring-2 ring-primary/10 border-primary/30 shadow-md scale-[1.02]' : 'shadow-sm'
                  }`}
                >
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1 font-display">{card.label}</p>
                    <p className="text-3xl font-bold text-slate-900 font-display">{count}</p>
                  </div>
                  <div className={`size-9 rounded-xl flex items-center justify-center ${colorClasses[card.color].bg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${colorClasses[card.color].text}`}>{card.icon}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="flex-1 relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Buscar por número o cliente..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap max-w-full">
              {['all', 'Pendiente', 'Aprobada', 'Renovada', 'Cancelada'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === status 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Número</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Cliente</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Fecha</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display text-right">Total</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Estado</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-6 font-display"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">Cargando...</td></tr>
                ) : paginatedQuotes.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 font-display">No hay cotizaciones</td></tr>
                ) : (
                  paginatedQuotes.map(q => (
                    <tr 
                      key={q.id} 
                      className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedQuoteId === q.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                      onClick={() => setSelectedQuoteId(q.id)}
                    >
                      <td className="p-4">
                        <span className="font-bold text-primary text-sm font-display group-hover:underline">{q.quote_number}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="font-bold text-slate-900 font-display">{q.clients?.company_name || q.clients?.full_name}</div>
                          <div className="text-xs text-slate-500 font-display">{q.clients?.email}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600 font-display">{new Date(q.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-slate-900 font-display">${formatCurrency(q.total_amount)}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-display border ${
                          q.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          q.status === 'Renovada' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          q.status === 'Cancelada' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            q.status === 'Aprobada' ? 'bg-emerald-500' :
                            q.status === 'Renovada' ? 'bg-blue-500' :
                            q.status === 'Cancelada' ? 'bg-red-500' :
                            'bg-amber-500'
                          }`}></span>
                          {q.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                          <span className={`material-symbols-outlined transition-all duration-300 ${selectedQuoteId === q.id ? 'text-primary translate-x-1' : ''}`}>
                            chevron_right
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Panel Sidebar */}
        <aside 
          className={`bg-white border-l border-slate-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden shadow-2xl ${
            selectedQuoteId ? "w-full lg:w-[450px] opacity-100" : "w-0 opacity-0 border-none"
          }`}
        >
          {!selectedQuoteId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white lg:min-w-[450px]">
              <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">description</span>
              <p className="text-slate-500 font-display">Selecciona una cotización para ver sus detalles.</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-full relative">
              {/* Botón de Cierre */}
              <button 
                onClick={() => setSelectedQuoteId(null)}
                className="absolute top-6 right-6 size-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all z-20"
                title="Cerrar detalles"
              >
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>

              {/* Sidebar Header */}
              <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 pr-24">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Detalle de Cotización</span>
                  <h3 className="text-xl font-bold text-slate-900 font-display mt-0.5">
                    {quotes.find(q => q.id === selectedQuoteId)?.quote_number}
                  </h3>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  quotes.find(q => q.id === selectedQuoteId)?.status === 'Aprobada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  quotes.find(q => q.id === selectedQuoteId)?.status === 'Renovada' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  quotes.find(q => q.id === selectedQuoteId)?.status === 'Cancelada' ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {quotes.find(q => q.id === selectedQuoteId)?.status}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {loadingItems ? (
                  <div className="text-center text-slate-400 py-10">Cargando ítems...</div>
                ) : (
                  <>
                    {/* Client Profile */}
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                        <span className="material-symbols-outlined text-3xl">person</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-slate-900 font-display leading-tight">
                          {quotes.find(q => q.id === selectedQuoteId)?.clients?.company_name || quotes.find(q => q.id === selectedQuoteId)?.clients?.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 font-display flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-sm font-bold">id_card</span>
                          {quotes.find(q => q.id === selectedQuoteId)?.clients?.document_type}: {quotes.find(q => q.id === selectedQuoteId)?.clients?.document_number || quotes.find(q => q.id === selectedQuoteId)?.clients?.nit}
                        </p>
                      </div>
                    </div>

                    {/* Contact Data Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Celular</p>
                        <p className="text-sm font-bold text-slate-900 font-display break-all">
                          {quotes.find(q => q.id === selectedQuoteId)?.clients?.phone || 'No registrado'}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Correo</p>
                        <p className="text-sm font-bold text-slate-900 font-display break-all">
                          {quotes.find(q => q.id === selectedQuoteId)?.clients?.email || 'No registrado'}
                        </p>
                      </div>
                    </div>

                    {/* Vigencia y Observaciones */}
                    <div className="space-y-4">
                      {quotes.find(q => q.id === selectedQuoteId)?.valid_until && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
                          <span className="material-symbols-outlined text-amber-600">event_available</span>
                          <div>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider font-display leading-none mb-1">Válida hasta</p>
                            <p className="text-sm font-black text-amber-700 font-display">
                              {new Date(quotes.find(q => q.id === selectedQuoteId)?.valid_until + 'T12:00:00').toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Observaciones</p>
                        <p className="text-sm text-slate-600 font-display italic">
                          {quotes.find(q => q.id === selectedQuoteId)?.observations ? `"${quotes.find(q => q.id === selectedQuoteId)?.observations}"` : 'Sin observaciones'}
                        </p>
                      </div>
                    </div>

                    {/* Purchase Details (Products) */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-relaxed mb-4 font-display">Productos Cotizados</h4>
                      <div className="space-y-4">
                        {selectedQuoteItems.map((item, idx) => (
                          <div key={idx} className="flex gap-3 items-center">
                            <div className="size-11 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 relative overflow-hidden group">
                              {item.products?.image_urls?.split(',')[0]?.trim() && (item.products.image_urls.split(',')[0].trim().startsWith('http') || item.products.image_urls.split(',')[0].trim().startsWith('/')) ? (
                                <Image 
                                  src={item.products.image_urls.split(',')[0].trim()} 
                                  alt={item.products.name} 
                                  fill 
                                  className="object-cover" 
                                />
                              ) : (
                                <span className="material-symbols-outlined">inventory_2</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate font-display">{item.products?.name || 'Producto desconocido'}</p>
                              <p className="text-xs text-slate-500 font-display">
                                {item.quantity} x ${formatCurrency(item.unit_price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900 font-display">
                                ${formatCurrency(item.quantity * item.unit_price)}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        <div className="pt-6 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between text-sm text-slate-500 font-display">
                            <span>Subtotal</span>
                            <span>${formatCurrency(quotes.find(q => q.id === selectedQuoteId)?.subtotal || 0)}</span>
                          </div>
                          {parseFloat(quotes.find(q => q.id === selectedQuoteId)?.discount_percentage?.toString() || '0') > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600 font-display font-medium">
                              <span>Descuento ({quotes.find(q => q.id === selectedQuoteId)?.discount_percentage}%)</span>
                              <span>-${formatCurrency(((quotes.find(q => q.id === selectedQuoteId)?.subtotal || 0) * (quotes.find(q => q.id === selectedQuoteId)?.discount_percentage || 0)) / 100)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                            <span className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">Total Final</span>
                            <span className="text-2xl font-black text-primary font-display">${formatCurrency(quotes.find(q => q.id === selectedQuoteId)?.total_amount || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      {/* Contact Dropdown */}
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
                                const q = quotes.find(q => q.id === selectedQuoteId);
                                const phone = q?.clients?.phone;
                                if (phone) window.open(`https://wa.me/57${phone.replace(/\D/g, '')}`, '_blank');
                                else alert('No hay teléfono registrado');
                                setIsContactMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-slate-100"
                            >
                              <span className="material-symbols-outlined text-[20px]">chat</span>
                              WhatsApp ({quotes.find(q => q.id === selectedQuoteId)?.clients?.phone || 'Sin número'})
                            </button>
                            <button
                              onClick={() => {
                                const q = quotes.find(q => q.id === selectedQuoteId);
                                const email = q?.clients?.email;
                                if (email) window.open(`mailto:${email}`, '_blank');
                                else alert('No hay correo registrado');
                                setIsContactMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">mail</span>
                              Correo ({quotes.find(q => q.id === selectedQuoteId)?.clients?.email || 'Sin correo'})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Status Dropdown */}
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
                            {['Pendiente', 'Aprobada', 'Renovada', 'Cancelada'].map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  handleStatusChange(selectedQuoteId, status);
                                  setIsStatusMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors ${quotes.find(q => q.id === selectedQuoteId)?.status === status ? 'text-primary bg-primary/5' : 'text-slate-600'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          const q = quotes.find(q => q.id === selectedQuoteId);
                          if (q) handleEditQuote(q);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3.5 rounded-xl font-bold text-sm transition-all shadow-sm font-display"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>

                      <button 
                        onClick={() => window.location.href = `/admin/pedidos?create=true&fromQuote=${selectedQuoteId}`}
                        className="col-span-2 w-full flex items-center justify-center gap-2 px-3 py-3.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 font-display mt-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
                        Convertir a Pedido
                      </button>

                      <button 
                        onClick={() => handleDeleteQuote(selectedQuoteId)}
                        className="col-span-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-red-400 hover:text-red-600 text-xs font-bold transition-colors font-display"
                      >
                        Eliminar Cotización
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">Nueva Cotización</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* CLIENT SEARCH SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 font-display uppercase tracking-wider text-xs">Información del Cliente</h3>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">{nextQuoteNumber}</span>
                </div>
                <div className="flex gap-3 relative">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Buscar por número de NIT o Documento..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-display"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person_search</span>
                  </div>
                  <button
                    onClick={() => {
                      fetchClients(clientSearchTerm);
                      setIsClientSearchModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors font-display flex items-center gap-2 text-sm shadow-lg shadow-slate-200"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    Buscar
                  </button>
                </div>
              </div>

              {selectedClient ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <span className="material-symbols-outlined text-2xl">person</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 font-display">
                          {selectedClient.company_name || selectedClient.full_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500 font-display">{selectedClient.document_type}: {selectedClient.document_number}</span>
                          <span className="size-1 rounded-full bg-slate-300"></span>
                          <span className="text-xs text-slate-500 font-display">{selectedClient.email}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedClient(null)} 
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Cambiar cliente"
                    >
                      <span className="material-symbols-outlined text-[20px]">cached</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">account_circle</span>
                  <p className="text-slate-400 text-sm font-display">No hay un cliente seleccionado</p>
                </div>
              )}

              {/* PRODUCTS SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 font-display uppercase tracking-wider text-xs">Productos y Equipos</h3>
                  <button
                    onClick={() => {
                      fetchProducts();
                      setIsProductSearchModalOpen(true);
                    }}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Agregar Productos
                  </button>
                </div>

                {selectedProducts.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cantidad</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unitario</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProducts.map((item, idx) => (
                          <tr key={item.product.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.product.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{item.product.sku}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center border border-slate-200 rounded-xl w-fit mx-auto overflow-hidden bg-white shadow-sm">
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                                  className="px-2 py-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">remove</span>
                                </button>
                                <span className="px-3 py-1.5 text-xs font-black text-slate-900 border-x border-slate-100 min-w-[32px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                                  className="px-2 py-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-bold text-slate-500">${formatCurrency(item.unit_price)}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-sm font-black text-slate-900">${formatCurrency(item.unit_price * item.quantity)}</span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleQuantityChange(item.product.id, 0)}
                                className="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-10 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                    <span className="material-symbols-outlined text-slate-200 text-5xl mb-3">shopping_cart</span>
                    <p className="text-slate-400 text-sm font-display">Agregue productos a la cotización</p>
                  </div>
                )}
              </div>

              {/* OBSERVATIONS & TOTALS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Vigencia de la Cotización</label>
                    <div className="relative">
                      <input 
                        type="date"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none font-display"
                        value={quoteForm.valid_until}
                        onChange={e => setQuoteForm({...quoteForm, valid_until: e.target.value})}
                      />
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Observaciones y Condiciones</label>
                    <textarea 
                      rows={4}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none font-display placeholder:text-slate-300"
                      placeholder="Indicar garantía, validez de oferta, condiciones de pago..."
                      value={quoteForm.observations}
                      onChange={e => setQuoteForm({...quoteForm, observations: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500">sell</span>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descuento Comercial</label>
                    </div>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1 shadow-sm">
                      <input 
                        type="number" 
                        className="w-12 py-1 bg-transparent text-sm text-center font-black text-emerald-600 outline-none"
                        value={quoteForm.discount_percentage}
                        onChange={e => setQuoteForm({...quoteForm, discount_percentage: e.target.value})}
                        min="0"
                        max="100"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-200/60">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-display">Subtotal Bruto</span>
                      <span className="font-bold text-slate-700 font-display">${formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span className="font-display font-medium">Descuento Aplicado</span>
                      <span className="font-bold font-display">-${formatCurrency((calculateSubtotal() * parseFloat(quoteForm.discount_percentage || '0')) / 100)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-slate-900 pt-3 border-t border-slate-200/60">
                      <span className="font-display">Total Final</span>
                      <span className="font-display text-primary">${formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold bg-white hover:bg-slate-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitQuote}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Generar Cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT SEARCH MODAL */}
      {isClientSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">person_search</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Seleccionar Cliente</h3>
              </div>
              <button 
                onClick={() => setIsClientSearchModalOpen(false)} 
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, NIT o correo..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    fetchClients(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-display shadow-inner"
                  autoFocus
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {clients.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-display">
                    No se encontraron clientes
                  </div>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className="p-4 border border-slate-100 rounded-2xl hover:bg-primary/5 hover:border-primary/20 cursor-pointer transition-all group active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors font-display">
                            {client.company_name || client.full_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{client.document_type}: {client.document_number}</span>
                            <span className="size-1 rounded-full bg-slate-200"></span>
                            <span className="text-xs text-slate-500 font-display">{client.email}</span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT SEARCH MODAL */}
      {isProductSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-display">Seleccionar Productos</h3>
              </div>
              <button 
                onClick={() => setIsProductSearchModalOpen(false)} 
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 border-b border-slate-100 bg-white">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos por nombre o SKU..."
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    fetchProducts(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-display shadow-inner"
                  autoFocus
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 gap-3">
                {products.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-display">
                    No se encontraron productos disponibles
                  </div>
                ) : (
                  products.map((product) => {
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
                        className={`p-4 border rounded-2xl flex items-center gap-4 transition-all group ${
                          isOutOfStock 
                            ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' 
                            : 'border-white bg-white shadow-sm hover:shadow-md hover:border-primary/20 cursor-pointer active:scale-[0.99]'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 font-display group-hover:text-primary transition-colors">
                              {product.name}
                            </p>
                            {isOutOfStock && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded uppercase tracking-widest">
                                Agotado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-display mt-0.5">
                            SKU: <span className="font-mono">{product.sku}</span> • Stock: <span className={`font-bold ${product.stock_quantity <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>{product.stock_quantity}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-lg font-display ${isOutOfStock ? 'text-slate-400' : 'text-primary'}`}>
                            ${formatCurrency(product.price)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminQuotesPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <AdminQuotesPageContent />
    </Suspense>
  );
}
