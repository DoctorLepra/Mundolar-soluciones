
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminDashboard() {

  const recentProducts = [
    { name: 'Motorola T400', category: 'Radio Portátil', sku: 'MOT-T400-BLK', stock: 45, price: '$89.99', status: 'Activo', statusColor: 'green', img: 'https://picsum.photos/100/100?random=101' },
    { name: 'Batería Li-Ion 2000mAh', category: 'Repuestos', sku: 'BAT-LI-2000', stock: 12, price: '$24.50', status: 'Bajo Stock', statusColor: 'yellow', img: 'https://picsum.photos/100/100?random=102' },
    { name: 'Antena VHF Larga', category: 'Accesorios', sku: 'ANT-VHF-LG', stock: 89, price: '$15.00', status: 'Activo', statusColor: 'green', img: 'https://picsum.photos/100/100?random=103' }
  ];

  const recentOrders = [
    { id: '#ORD-00921', client: 'Juan López', avatar: 'JL', date: 'Oct 24, 2023', total: '$345.00', status: 'Procesando', statusColor: 'blue' },
    { id: '#ORD-00920', client: 'Carlos Méndez', avatar: 'CM', date: 'Oct 23, 2023', total: '$1,200.00', status: 'Completado', statusColor: 'green' },
    { id: '#ORD-00919', client: 'Empresa Polanco', avatar: 'EP', date: 'Oct 22, 2023', total: '$85.50', status: 'Enviado', statusColor: 'slate' }
  ];

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Vista General</h2>
              <p className="text-slate-500 mt-1">Resumen de actividad y rendimiento de la tienda hoy.</p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium font-display flex items-center gap-2 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span> Exportar
              </button>
              <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium font-display flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[18px]">add</span> Nuevo Producto
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-primary text-[24px]">attach_money</span></div>
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold font-display">+12.5%</span>
            </div>
            <p className="text-slate-500 text-sm font-display mb-1">Ventas Totales</p>
            <h3 className="text-2xl font-bold text-slate-900 font-display">$4,250.00</h3>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 rounded-lg"><span className="material-symbols-outlined text-orange-500 text-[24px]">pending_actions</span></div>
              <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-bold font-display">Pendientes</span>
            </div>
            <p className="text-slate-500 text-sm font-display mb-1">Pedidos Activos</p>
            <h3 className="text-2xl font-bold text-slate-900 font-display">12</h3>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 rounded-lg"><span className="material-symbols-outlined text-purple-500 text-[24px]">group_add</span></div>
              <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold font-display">+3.2%</span>
            </div>
            <p className="text-slate-500 text-sm font-display mb-1">Nuevos Clientes</p>
            <h3 className="text-2xl font-bold text-slate-900 font-display">156</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 font-display">Inventario Reciente</h3>
              <Link className="text-sm text-primary font-medium hover:underline font-display" href="/admin/productos">Ver todo</Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display">Producto</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display">SKU</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-right">Stock</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-right">Precio</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-display text-center">Estado</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentProducts.map(p => (
                      <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative">
                              <Image 
                                src={p.img} 
                                className="object-cover" 
                                alt={p.name}
                                fill
                                sizes="40px"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900">{p.name}</p>
                              <p className="text-xs text-slate-500">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 font-mono">{p.sku}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 font-medium text-right">{p.stock}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 font-medium text-right">{p.price}</td>
                        <td className="py-3 px-4 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${p.statusColor}-100 text-${p.statusColor}-800`}>{p.status}</span></td>
                        <td className="py-3 px-4 text-right"><button className="text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">more_vert</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 font-display">CMS Rápido</h3>
              <button className="text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-[20px]">open_in_new</span></button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 h-full">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">Editar Página</label>
                <select defaultValue="promo" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-primary focus:border-primary p-2.5">
                  <option value="promo">Promo - Radios Móviles</option>
                  <option value="home">Inicio - Banner Principal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-display">Contenido</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm p-3" rows={4} defaultValue="¡Oferta de Temporada! 20% OFF en Motorola."></textarea>
              </div>
              <div className="mt-auto pt-2 flex gap-3">
                <button className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-bold font-display hover:bg-primary/90 shadow-lg shadow-primary/20">Publicar Cambios</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 font-display">Pedidos Recientes</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">ID Pedido</th>
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Cliente</th>
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-mono text-primary font-medium">{o.id}</td>
                    <td className="py-4 px-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{o.avatar}</div><div className="text-sm font-medium text-slate-900">{o.client}</div></div></td>
                    <td className="py-4 px-6 text-sm text-slate-500">{o.date}</td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-900">{o.total}</td>
                    <td className="py-4 px-6"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${o.statusColor}-100 text-${o.statusColor}-800`}><span className={`w-1.5 h-1.5 rounded-full bg-${o.statusColor}-500`}></span>{o.status}</span></td>
                    <td className="py-4 px-6 text-right"><Link href="/admin/pedidos" className="text-sm font-medium text-slate-500 hover:text-primary underline decoration-slate-300 hover:decoration-primary underline-offset-4">Ver Detalles</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
