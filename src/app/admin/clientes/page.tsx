'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const AdminClientsPage = () => {
  const [selectedClient, setSelectedClient] = useState(1);

  const clients = [
    { id: 1, name: 'Juan Pérez', company: 'Radiocom Chile', email: 'juan@radiocom.cl', phone: '+56 9 1234 5678', lastOrderDate: '12 Oct 2023', lastOrderValue: '$1.2M CLP', status: 'Activo', statusColor: 'emerald', type: 'domain', avatarUrl: 'https://picsum.photos/seed/juan/100/100' },
    { id: 2, name: 'Maria Gonzalez', company: 'Logística Norte', email: 'maria@logisticanorte.cl', phone: '+56 9 8765 4321', lastOrderDate: '10 Oct 2023', lastOrderValue: '$850k CLP', status: 'Activo', statusColor: 'emerald', type: 'domain', avatarUrl: 'https://picsum.photos/seed/maria/100/100' },
    { id: 3, name: 'Carlos Ruiz', company: 'Particular', email: 'carlos.ruiz@gmail.com', phone: '+56 9 5555 1234', lastOrderDate: '15 Sep 2023', lastOrderValue: '$120k CLP', status: 'Inactivo', statusColor: 'slate', type: 'person', avatarInitial: 'CR' },
    { id: 4, name: 'Ana Soto', company: 'Constructora AS', email: 'contacto@constructora-as.cl', phone: '+56 9 2222 3333', lastOrderDate: '01 Oct 2023', lastOrderValue: '$3.5M CLP', status: 'Pendiente', statusColor: 'amber', type: 'domain', avatarUrl: 'https://picsum.photos/seed/ana/100/100' },
  ];
  
  const clientDetails = {
    id: 1,
    name: 'Juan Pérez',
    company: 'Radiocomunicaciones Chile',
    tag: 'Cliente VIP',
    tagColor: 'emerald',
    avatarUrl: 'https://picsum.photos/seed/juan/100/100',
    email: 'juan@radiocom.cl',
    phone: '+56 9 1234 5678',
    address: 'Av. Providencia 1234, Of 405, Santiago',
    lastOrders: [
      { id: '#ORD-2023-889', status: 'Entregado', statusColor: 'emerald', items: 'Radio Portátil Motorola DEP450 (x5)', date: '12 Oct 2023', value: '$1.2M CLP' },
      { id: '#ORD-2023-750', status: 'Facturado', statusColor: 'slate', items: 'Servicio Técnico Móvil', date: '01 Sep 2023', value: '$150k CLP' }
    ],
    notes: 'Cliente solicita mantención de equipos móviles cada 6 meses. Pendiente contactar para renovación de contrato en Diciembre.'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">Gestión de Clientes</h2>
          <p className="text-slate-500 text-sm font-display">Administra la base de datos de clientes, historiales y notas.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-primary/30 font-display">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Nuevo Cliente</span>
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Total Clientes</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">1,248</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">trending_up</span> +12%
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Activos este Mes</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">856</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">trending_up</span> +5%
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1 font-display">Nuevos (30d)</p>
                  <p className="text-3xl font-bold text-slate-900 font-display">42</p>
                </div>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold font-display">
                  <span className="material-symbols-outlined text-sm">trending_up</span> +2%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                  <input className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-900 placeholder-slate-400 shadow-sm font-display" placeholder="Buscar por nombre, empresa o email..." type="text"/>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm font-display">
                  <span className="material-symbols-outlined text-[20px]">filter_list</span> Filtros
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm font-display">
                  <span className="material-symbols-outlined text-[20px]">download</span> Exportar
                </button>
              </div>
               <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium shadow-sm shadow-primary/20 font-display">
                  <span>Todos</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors font-display">
                  <span className="size-2 rounded-full bg-emerald-500"></span>
                  <span>Activos</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors font-display">
                  <span className="size-2 rounded-full bg-slate-400"></span>
                  <span>Inactivos</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors font-display">
                  <span className="material-symbols-outlined text-[16px]">domain</span>
                  <span>Corporativos</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-sm font-medium hover:border-primary hover:text-primary transition-colors font-display">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>Particulares</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Cliente</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell font-display">Empresa</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell font-display">Contacto</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Estado</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-display"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {clients.map(client => (
                      <tr key={client.id} onClick={() => setSelectedClient(client.id)} className={`group hover:bg-slate-50 transition-colors cursor-pointer ${selectedClient === client.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {client.avatarUrl ? (
                              <div className="size-10 rounded-full overflow-hidden relative border border-slate-100 shadow-sm">
                                <Image src={client.avatarUrl} alt={client.name} fill sizes="40px" className="object-cover" />
                              </div>
                            ) : (
                              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-display">
                                {client.avatarInitial}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 text-sm font-display">{client.name}</p>
                              <p className="text-xs text-slate-500 font-display">ID: #C-1023{client.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">{client.type}</span>
                            <span className="text-sm text-slate-700 font-display">{client.company}</span>
                          </div>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <div className="flex flex-col font-display">
                            <span className="text-sm text-slate-700">{client.email}</span>
                            <span className="text-xs text-slate-500">{client.phone}</span>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-${client.statusColor}-100 text-${client.statusColor}-700 font-display border border-${client.statusColor}-200`}>
                            <span className={`size-1.5 rounded-full bg-${client.statusColor}-500`}></span>
                            {client.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
                <p className="text-sm text-slate-500 font-display">Mostrando <span className="font-bold text-slate-900">1-4</span> de <span className="font-bold text-slate-900">1,248</span></p>
                <div className="flex items-center gap-2">
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary disabled:opacity-50 transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <aside className="w-[400px] border-l border-slate-200 bg-white flex-col hidden 2xl:flex overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Perfil del Cliente</div>
            </div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-24 rounded-full overflow-hidden relative mb-3 border-4 border-slate-50 shadow-md">
                <Image src={clientDetails.avatarUrl} alt={clientDetails.name} fill sizes="96px" className="object-cover" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">{clientDetails.name}</h3>
              <p className="text-slate-500 text-sm mb-2 font-display">{clientDetails.company}</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-${clientDetails.tagColor}-100 text-${clientDetails.tagColor}-700 font-display border border-${clientDetails.tagColor}-200`}>
                {clientDetails.tag}
              </span>
            </div>
            <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
              <button className="flex-1 pb-2 text-sm font-bold border-b-2 border-primary text-primary font-display">General</button>
              <button className="flex-1 pb-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-display transition-colors">Historial</button>
            </div>
            <div className="space-y-6 pb-8">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 font-display">Información de Contacto</h4>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>
                  </div>
                  <span>{clientDetails.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-display">
                  <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">phone</span>
                  </div>
                  <span>{clientDetails.phone}</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 font-display">Últimos Pedidos</h4>
                {clientDetails.lastOrders.map(order => (
                  <div key={order.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-mono text-slate-400">{order.id}</span>
                       <span className={`text-xs font-bold text-${order.statusColor}-600`}>{order.status}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1 font-display">{order.items}</p>
                    <p className="text-xs text-slate-500 font-display">{order.date} • {order.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between font-display">
                  Notas Administrativas
                </h4>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-slate-700 font-display leading-relaxed">
                  <p>{clientDetails.notes}</p>
                </div>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors font-display">
                  <span className="material-symbols-outlined text-[18px]">mail</span>Email
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-md shadow-primary/20 font-display">
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>Pedido
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminClientsPage;
