'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('#10235');

  const orders = [
    { id: '#10234', client: 'Juan Pérez', email: 'juan.perez@email.com', date: '12 Oct 2023', total: '$500.00', status: 'Pendiente', color: 'amber' },
    { id: '#10235', client: 'Maria Gomez', email: 'maria.g@email.com', date: '12 Oct 2023', total: '$45.00', status: 'Enviado', color: 'indigo' },
    { id: '#10232', client: 'Carlos Ruiz', email: 'carlos.tcom@corp.com', date: '11 Oct 2023', total: '$1,250.00', status: 'Procesando', color: 'blue' },
    { id: '#10230', client: 'Telecom Sur SpA', email: 'compras@telecomsur.cl', date: '10 Oct 2023', total: '$3,890.00', status: 'Completado', color: 'green' },
    { id: '#10228', client: 'Luis Hernandez', email: 'lhernandez@gmail.com', date: '10 Oct 2023', total: '$120.00', status: 'Completado', color: 'green' },
  ];

  const orderDetails = {
    id: '#10235', date: '12 Oct 2023, 14:30 PM', status: 'Enviado',
    customer: { name: 'Maria Gomez', email: 'maria.g@email.com', phone: '+56 9 1234 5678' },
    shippingAddress: { line1: 'Av. Providencia 1234, Of. 405', line2: 'Providencia, Santiago', line3: 'Región Metropolitana, Chile' },
    products: [{ name: 'Repuesto Antena VHF - M200', sku: 'ANT-VHF-001', price: 45.00, qty: 1, img: 'https://picsum.photos/100/100?random=21' }],
    totals: { subtotal: 45.00, shipping: 0.00, total: 45.00 }
  };
  
  const kpis = [
    { label: 'Total Pedidos', value: '1,245', trend: '+12%', trendColor: 'green' },
    { label: 'Pendientes', value: '12', trend: '2%', trendColor: 'amber' },
    { label: 'Ingresos Hoy', value: `$${formatCurrency(2450)}`, trend: '+8%', trendColor: 'green' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight font-display">Gestión de Pedidos</h1>
          <p className="text-slate-500 max-w-2xl">Administra, rastrea y actualiza el estado de los pedidos de equipos de telecomunicaciones en tiempo real.</p>
        </div>
        <div className="flex gap-4 w-full xl:flex-1">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 flex-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-display">{kpi.label}</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-slate-900 font-display">{kpi.value}</span>
                <span className={`text-xs font-bold text-${kpi.trendColor}-600 bg-${kpi.trendColor}-100 px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
                  <span className="material-symbols-outlined text-[14px]">{kpi.trend.startsWith('+') ? 'trending_up' : 'schedule'}</span>
                  {kpi.trend.replace('+', '')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="material-symbols-outlined text-slate-400">search</span></div>
          <input className="block w-full pl-10 pr-4 py-2.5 border-none ring-1 ring-slate-400 rounded-lg bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-display" placeholder="Buscar por ID, cliente o correo..." type="text"/>
        </div>
        <div className="flex flex-wrap w-full md:w-auto gap-3 justify-end md:justify-start">
            <div className="relative min-w-[140px]">
                <select className="appearance-none block w-full pl-4 pr-10 py-2.5 border-none ring-1 ring-slate-400 rounded-lg bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-display">
                    <option value="">Estado: Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="processing">Procesando</option>
                    <option value="shipped">Enviado</option>
                    <option value="completed">Completado</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </div>
            </div>
            <div className="relative min-w-[140px]">
                <select className="appearance-none block w-full pl-4 pr-10 py-2.5 border-none ring-1 ring-slate-400 rounded-lg bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-display">
                    <option value="">Fecha: Hoy</option>
                    <option value="week">Esta Semana</option>
                    <option value="month">Este Mes</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                    <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                </div>
            </div>
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm whitespace-nowrap font-display">
                <span className="material-symbols-outlined text-[20px]">download</span>Exportar
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start h-full pb-8">
        <div className="flex-1 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display">ID Pedido</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display">Cliente</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display">Fecha</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-right">Total</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-center">Estado</th>
                  <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelectedOrderId(o.id)} className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedOrderId === o.id ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-4 px-6"><span className="font-bold text-primary group-hover:underline font-display">{o.id}</span></td>
                    <td className="py-4 px-6"><div className="flex flex-col"><span className="font-medium text-slate-900 font-display">{o.client}</span><span className="text-xs text-slate-500">{o.email}</span></div></td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-display">{o.date}</td>
                    <td className="py-4 px-6 text-right font-medium text-slate-900 font-display">${formatCurrency(o.total.replace('$', '').replace(',', ''))}</td>
                    <td className="py-4 px-6 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${o.color}-100 text-${o.color}-800 border border-${o.color}-200 font-display`}>{o.status}</span></td>
                    <td className="py-4 px-6 text-right"><button className="text-slate-400 hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-[20px]">visibility</span></button><button className="text-slate-400 hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-[20px]">edit</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-display">Mostrando <span className="font-medium">1</span> a <span className="font-medium">5</span> de <span className="font-medium">1245</span> resultados</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 font-display">Anterior</button>
              <button className="px-3 py-1 rounded border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 font-display">Siguiente</button>
            </div>
          </div>
        </div>

        {selectedOrderId && (
          <aside className="w-full lg:w-[400px] shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6 sticky top-24">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 font-display">Pedido {orderDetails.id}</h3>
                  <p className="text-sm text-slate-500 mt-1 font-display">Realizado el {orderDetails.date}</p>
                </div>
                <button onClick={() => setSelectedOrderId(null)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>Cliente
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="font-medium text-slate-800 font-display">{orderDetails.customer.name}</p>
                  <p className="text-sm text-slate-500 font-display">{orderDetails.customer.email}</p>
                  <p className="text-sm text-slate-500 font-display">{orderDetails.customer.phone}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">local_shipping</span>Dirección de Envío
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-700 font-display">{orderDetails.shippingAddress.line1}<br/>{orderDetails.shippingAddress.line2}<br/>{orderDetails.shippingAddress.line3}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">inventory_2</span>Productos ({orderDetails.products.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {orderDetails.products.map(p => (
                    <div key={p.sku} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg">
                      <div className="size-12 rounded bg-slate-100 overflow-hidden shrink-0 relative">
                        <Image src={p.img} alt={p.name} fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate font-display">{p.name}</p>
                        <p className="text-xs text-slate-500 font-display">SKU: {p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 font-display">${p.price.toFixed(2)}</p>
                        <p className="text-xs text-slate-500 font-display">x{p.qty}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-1">
                  <div className="flex justify-between text-sm text-slate-500 font-display"><span>Subtotal</span><span>${formatCurrency(orderDetails.totals.subtotal)}</span></div>
                  <div className="flex justify-between text-sm text-slate-500 font-display"><span>Envío</span><span>${formatCurrency(orderDetails.totals.shipping)}</span></div>
                  <div className="flex justify-between text-base font-bold text-slate-900 mt-1 font-display"><span>Total</span><span>${formatCurrency(orderDetails.totals.total)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors font-display">
                  <span className="material-symbols-outlined text-[18px]">print</span>Imprimir
                </button>
                <button className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors font-display">
                  <span className="material-symbols-outlined text-[18px]">mail</span>Contactar
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
