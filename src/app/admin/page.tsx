'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { AlertTriangle, TrendingUp, Package, MapPin, CheckCircle2, Clock, ClipboardList, FileText, Warehouse } from 'lucide-react';

/*
- [ ] Sistema de Autenticación y Gestión de Usuarios <!-- id: 50 -->
  - [x] Implementar esquema SQL para `profiles` y RLS <!-- id: 51 -->
  - [x] Crear página de Login Premium (`/login`) <!-- id: 52 -->
  - [x] Implementar panel de Gestión de Usuarios (`/admin/usuarios`) <!-- id: 53 -->
  - [x] Implementar flujo de Invitación vía email <!-- id: 54 -->
  - [x] Implementar vista de Cambio de Contraseña Obligatorio <!-- id: 55 -->
  - [x] Ocultar Navbar y Footer en vistas de Auth/Login <!-- id: 57 -->
  - [ ] Verificar políticas de acceso por roles <!-- id: 56 -->
*/
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    activeOrders: 0,
    newClients: 0,
    pendingTasks: 0,
    pendingQuotes: 0,
    totalWarehouses: 0
  });
  const [recentInventory, setRecentInventory] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUserProfile();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!userProfile) return;
    try {
      setLoading(true);
      const isAdmin = userProfile.role === 'Admin';
      
      // 1. Fetch Basic Metrics
      let ordersQuery = supabase.from('orders').select('*, order_items(quantity, price_at_purchase, product_id)');
      if (!isAdmin) {
        ordersQuery = ordersQuery.eq('created_by_id', userProfile.id);
      }
      const { data: ordersData } = await ordersQuery;
      
      if (!ordersData) return;

      const totalSales = ordersData.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
      const activeOrdersCount = ordersData.filter(o => ['Pendiente', 'Procesando', 'Procesado'].includes(o.status)).length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: newClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setMetrics({
        totalSales,
        activeOrders: activeOrdersCount,
        newClients: newClients || 0,
        pendingTasks: 0,
        pendingQuotes: 0,
        totalWarehouses: 0
      });

      // 1.1 Fetch Operational Metrics
      let tasksQuery = supabase.from('client_tasks').select('*', { count: 'exact', head: true }).eq('status', 'Pendiente');
      let quotesQuery = supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'Pendiente');
      
      if (!isAdmin) {
        tasksQuery = tasksQuery.or(`assigned_to_id.eq.${userProfile.id},created_by_id.eq.${userProfile.id}`);
        quotesQuery = quotesQuery.eq('created_by_id', userProfile.id);
      }

      const [{ count: pendingTasks }, { count: pendingQuotes }, { count: totalWarehouses }] = await Promise.all([
        tasksQuery,
        quotesQuery,
        supabase.from('warehouses').select('*', { count: 'exact', head: true })
      ]);

      setMetrics(prev => ({
        ...prev,
        pendingTasks: pendingTasks || 0,
        pendingQuotes: pendingQuotes || 0,
        totalWarehouses: totalWarehouses || 0
      }));

      // 2. Sales Trend (Last 7 days)
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const trend = last7Days.map(date => {
        const dayOrders = ordersData.filter(o => o.created_at.startsWith(date));
        const total = dayOrders.reduce((acc, o) => acc + o.total_amount, 0);
        return { name: date.split('-').slice(1).join('/'), total };
      });
      setSalesTrend(trend);

      // 3. Status Distribution
      const statusMap = ordersData.reduce((acc: any, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      setStatusDistribution(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      // 4. Top Products & Low Stock
      const { data: productsData } = await supabase.from('products').select('*');
      if (productsData) {
        // Low Stock (between 0 and 5 units, only with valid names)
        const lowStock = productsData
          .filter(p => p.stock_quantity >= 0 && p.stock_quantity <= 5 && p.name)
          .sort((a, b) => a.stock_quantity - b.stock_quantity)
          .slice(0, 5);
        setLowStockProducts(lowStock);

        // Top Selling (calculating from order_items)
        const productSales: any = {};
        ordersData.forEach(o => {
          o.order_items?.forEach((item: any) => {
            const pid = item.product_id;
            if (pid) {
              productSales[pid] = (productSales[pid] || 0) + item.quantity;
            }
          });
        });
        
        const top = Object.entries(productSales)
          .map(([id, qty]: any) => {
            const p = productsData.find(prod => prod.id.toString() === id.toString());
            return { name: p?.name || 'Desconocido', qty, id };
          })
          .filter(p => p.name !== 'Desconocido')
          .sort((a: any, b: any) => b.qty - a.qty)
          .slice(0, 5);
        setTopProducts(top);
      }

      // 5. Geo Data (by Department)
      const geoMap = ordersData.reduce((acc: any, o) => {
        try {
          const addr = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address;
          const dept = addr?.department || 'Otros';
          acc[dept] = (acc[dept] || 0) + 1;
        } catch (e) {
          acc['Otros'] = (acc['Otros'] || 0) + 1;
        }
        return acc;
      }, {});
      setGeoData(Object.entries(geoMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5));

      // 6. Recent Lists
      const { data: inventoryData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentInventory(inventoryData || []);

      let recentOrdersQuery = supabase
        .from('orders')
        .select('*, clients(full_name, company_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!isAdmin) {
        recentOrdersQuery = recentOrdersQuery.eq('created_by_id', userProfile.id);
      }
      const { data: recentOrdersData } = await recentOrdersQuery;
      setRecentOrders(recentOrdersData || []);

    } catch (error) {
      console.error('Error dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const isAdmin = userProfile?.role === 'Admin';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-slate-50 h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
          <p className="text-slate-500 font-display font-medium animate-pulse">Analizando Mundolar...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-display tracking-tight text-balance">Panel de Control</h2>
            <p className="text-slate-500 font-medium">Análisis en tiempo real de telecomunicaciones profesionales.</p>
          </div>
          <Link href="/admin/pedidos" className="hidden md:flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Clock size={18} /> Ver Actividad
          </Link>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <TrendingUp size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Ingresos</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 font-display">${formatCurrency(metrics.totalSales)}</h3>
            <p className="text-slate-400 text-xs mt-1 font-bold">HISTÓRICO ACUMULADO</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Package size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pedidos Activos</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 font-display">{metrics.activeOrders}</h3>
            <p className="text-slate-400 text-xs mt-1 font-bold">GESTIÓN EN CURSO</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <MapPin size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nuevos Clientes 30D</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 font-display">{metrics.newClients}</h3>
            <p className="text-slate-400 text-xs mt-1 font-bold">CRECIMIENTO MENSUAL</p>
          </div>
        </div>

        {/* Operational Metrics Row */}
        <div className={`grid grid-cols-1 md:grid-cols-${isAdmin ? '3' : '2'} gap-6`}>
          <Link href="/admin/clientes" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ClipboardList size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tareas CRM</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 font-display">{metrics.pendingTasks}</h3>
            <p className="text-slate-400 text-xs mt-1 font-bold">TAREAS POR REALIZAR</p>
          </Link>

          <Link href="/admin/cotizaciones" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 bg-pink-50 rounded-2xl text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cotizaciones</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 font-display">{metrics.pendingQuotes}</h3>
            <p className="text-slate-400 text-xs mt-1 font-bold">POR APROBAR</p>
          </Link>

          {isAdmin && (
            <Link href="/admin/bodegas" className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-center mb-4">
                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Warehouse size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bodegas</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 font-display">{metrics.totalWarehouses}</h3>
              <p className="text-slate-400 text-xs mt-1 font-bold">BODEGAS ACTIVAS</p>
            </Link>
          )}
        </div>

        {/* Main Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend Graph */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 font-display">Tendencia de Ventas (7D)</h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Automático</span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11, fontWeight: 700}} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{fontWeight: 900, marginBottom: '4px'}}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Donut */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-slate-900 font-display mb-6">Distribución de Pedidos</h3>
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    cornerRadius={10}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-6">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Estados</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
              {statusDistribution.slice(0, 4).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                  <span className="text-[10px] font-bold text-slate-600 truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Top Selling Products */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={16}/></div>
              <h3 className="text-md font-black text-slate-900 font-display uppercase tracking-tight">Top Ventas</h3>
            </div>
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300 w-4">#0{i+1}</span>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors truncate max-w-[140px]">{p.name}</span>
                  </div>
                  <span className="text-xs font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-lg">{p.qty} unid.</span>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-xs text-slate-400 font-display text-center py-4">Sin datos de ventas.</p>}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={16}/></div>
              <h3 className="text-md font-black text-slate-900 font-display uppercase tracking-tight">Stock Crítico</h3>
            </div>
            <div className="space-y-4">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="size-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-700 truncate max-w-[180px] font-display">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-tighter border border-red-100">
                      {p.stock_quantity} UNID.
                    </span>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && <div className="flex flex-col items-center py-4"><CheckCircle2 className="text-emerald-500 mb-2" size={24}/><p className="text-xs text-slate-400 font-bold uppercase">Stock Saludable</p></div>}
            </div>
          </div>

          {/* Geo Segmentation */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-slate-900 text-white rounded-lg"><MapPin size={16}/></div>
              <h3 className="text-md font-black text-slate-900 font-display uppercase tracking-tight">Geografía de Pedidos</h3>
            </div>
            <div className="space-y-4">
              {geoData.map(g => (
                <div key={g.name} className="space-y-1.5 font-display">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600">{g.name}</span>
                    <span className="text-slate-900">{g.count} pedidos</span>
                  </div>
                  <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full rounded-full transition-all duration-1000" style={{width: `${(g.count / (geoData[0]?.count || 1)) * 100}%`}}></div>
                  </div>
                </div>
              ))}
              {geoData.length === 0 && <p className="text-xs text-slate-400 font-display text-center py-4">Sin datos geográficos.</p>}
            </div>
          </div>

        </div>

        {/* Existing Activity Section - Redesigned to fit the New Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Orders - Occupies 2 columns now */}
          <div className="lg:col-span-2 flex flex-col gap-4 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 pb-0 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 font-display">Pedidos Recientes</h3>
              <Link href="/admin/pedidos" className="text-xs font-bold text-primary hover:underline">Ver Historial Completo</Link>
            </div>
            <div className="overflow-x-auto p-4 pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 font-display">Pedido</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 font-display">Cliente</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 font-display text-right">Total</th>
                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 font-display text-center">Estado</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map(o => (
                    <tr key={o.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-[11px] font-black text-primary font-mono tracking-tighter">#{o.id.toString().padStart(5, '0')}</td>
                      <td className="py-4 px-4 font-display">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-200">
                            {(o.clients?.full_name || o.clients?.company_name || 'C').substring(0, 1)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{o.clients?.full_name || o.clients?.company_name || 'Cliente'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm font-black text-slate-900 font-display text-right">${formatCurrency(o.total_amount)}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          o.status === 'Completado' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/admin/pedidos?id=${o.id}`} className="p-1.5 bg-slate-50  text-slate-400 rounded-lg group-hover:bg-primary group-hover:text-white transition-all inline-flex">
                          <span className="material-symbols-outlined text-[18px]">east</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Inventory / Recently Added */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-black text-slate-900 font-display">Inventario Reciente</h3>
            </div>
            <div className="flex-1 space-y-2 p-4 pt-2">
              {recentInventory.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-all group">
                  <div className="size-10 bg-slate-100 rounded-xl overflow-hidden relative flex-shrink-0 border border-slate-100">
                    {(() => {
                      const images = typeof p.image_urls === 'string' ? JSON.parse(p.image_urls) : p.image_urls;
                      const imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null;
                      return imageUrl ? <Image src={imageUrl} alt={p.name} fill className="object-cover" /> : <Package className="text-slate-300 m-auto mt-2" size={18}/>;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate font-display">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-primary font-display">${formatCurrency(p.price)}</p>
                    <p className={`text-[9px] font-black ${p.stock_quantity <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>STOCK: {p.stock_quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              <Link href="/admin/productos" className="flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
                Gestionar Todo <TrendingUp size={12}/>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
