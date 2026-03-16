'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { colombiaData, departments } from '@/lib/colombia-data';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function CartPage() {
  usePageTitle('Carrito');
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form states
  const [formData, setFormData] = React.useState({
    full_name: '',
    document_type: '',
    document_number: '',
    phone: '',
    email: '',
    department: '',
    municipality: '',
    address: ''
  });

  const subtotal = cartTotal / 1.19;
  const estimatedTax = cartTotal - subtotal;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'department') {
        newData.municipality = '';
      }
      return newData;
    });
  };

  const handleCheckout = async () => {
    // Validation
    const requiredFields = ['full_name', 'document_type', 'document_number', 'phone', 'email', 'department', 'municipality', 'address'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        alert(`Por favor complete el campo: ${field.replace('_', ' ')}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Create or Update Client
      // Check if client exists by document_number
      let clientId: string;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('document_number', formData.document_number)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        // Update existing client data if needed
        await supabase.from('clients').update({
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
          department: formData.department,
          municipality: formData.municipality,
          address: formData.address,
          document_type: formData.document_type
        }).eq('id', clientId);
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            full_name: formData.full_name,
            document_type: formData.document_type,
            document_number: formData.document_number,
            phone: formData.phone,
            email: formData.email,
            department: formData.department,
            municipality: formData.municipality,
            address: formData.address,
            client_type: 'Natural',
            source: 'Nuevo',
            source_type: 'Nuevo',
            status: 'Activo'
          })
          .select()
          .maybeSingle();

        if (clientError) throw clientError;
        
        // If select() returned nothing (RLS), try to get the ID by searching again
        if (!newClient) {
          const { data: reFetchedClient } = await supabase
            .from('clients')
            .select('id')
            .eq('document_number', formData.document_number)
            .maybeSingle();
          
          if (!reFetchedClient) throw new Error('Error al confirmar la creación del cliente.');
          clientId = reFetchedClient.id;
        } else {
          clientId = newClient.id;
        }
      }

      // 2. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          total_amount: cartTotal,
          subtotal: subtotal,
          discount_percentage: 0,
          status: 'Pendiente',
          shipping_address: {
            department: formData.department,
            municipality: formData.municipality,
            address: formData.address,
            phone: formData.phone,
            email: formData.email
          }
        })
        .select()
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) throw new Error('No se pudo crear el pedido.');

      // 3. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price_with_iva || (item.price * 1.19)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. WhatsApp Redirection
      const productLines = cart.map(item => {
        const unitPrice = item.price_with_iva || (item.price * 1.19);
        const totalPrice = unitPrice * item.quantity;
        const sku = item.sku || 'N/A';
        return `- ${sku} ${item.name} (${item.quantity}) $${formatCurrency(unitPrice)} $${formatCurrency(totalPrice)}`;
      }).join('\n');
      
      const orderLink = `${window.location.origin}/pedido/${btoa('ML-' + order.id)}`;
      
      const messageText = `Hola quiero realizar la compra de los siguientes productos:\n${productLines}\n\n-TOTAL VALOR DEL PEDIDO: $${formatCurrency(cartTotal)}\n\nFactura/Pedido: ${orderLink}`;
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=573052200300&text=${encodeURIComponent(messageText)}`;
      
      clearCart();
      window.open(whatsappUrl, '_blank');
      
    } catch (error: any) {
      console.error('Error in checkout details:', error);
      // Use Object.getOwnPropertyNames to get non-enumerable properties like 'message' or 'details'
      const errorDetail = error?.message || error?.details || JSON.stringify(error, Object.getOwnPropertyNames(error));
      alert(`Hubo un error procesando su pedido: ${errorDetail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
          <span className="material-symbols-outlined text-4xl">shopping_cart_off</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Tu carrito está vacío</h1>
        <p className="text-slate-500 mb-8 text-center max-w-md">Parece que aún no has agregado ningún producto a tu carrito de compras.</p>
        <Link 
          href="/catalogo" 
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background-light min-h-screen">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Tu Carrito ({cartCount} {cartCount === 1 ? 'Artículo' : 'Artículos'})
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full space-y-8">
            {/* Products List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <div className="col-span-6">Producto</div>
                <div className="col-span-2 text-center">Precio</div>
                <div className="col-span-2 text-center">Cantidad</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {cart.map((item) => {
                  const itemPrice = item.price_with_iva || (item.price * 1.19);
                  return (
                    <div key={item.id} className="p-6 flex flex-col md:grid md:grid-cols-12 gap-6 items-center">
                      <div className="flex gap-4 col-span-6 w-full">
                        <div className="shrink-0 h-24 w-24 rounded-lg bg-slate-50 overflow-hidden border border-slate-200 relative">
                          <Image 
                            src={item.image_url} 
                            alt={item.name}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <h3 className="font-bold text-slate-900 text-lg">{item.name}</h3>
                          <p className="text-sm text-slate-500 mb-1">{item.brand_name || 'Marca'}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-fit">
                            En Stock
                          </span>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="md:hidden mt-2 text-xs font-medium text-red-500 flex items-center gap-1 hover:text-red-600"
                          >
                            <span className="material-symbols-outlined text-base">delete</span> Eliminar
                          </button>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex md:justify-center w-full md:w-auto justify-between items-center md:items-start">
                        <span className="md:hidden text-sm text-slate-500">Precio:</span>
                        <span className="text-slate-900 font-medium">${formatCurrency(itemPrice)}</span>
                      </div>
                      
                      <div className="col-span-2 flex md:justify-center w-full md:w-auto justify-between items-center">
                        <span className="md:hidden text-sm text-slate-500">Cantidad:</span>
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 px-2 hover:bg-slate-50 text-slate-600 transition-colors rounded-l-lg"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">remove</span>
                          </button>
                          <input 
                            className="w-10 text-center text-sm border-none p-0 focus:ring-0 bg-transparent text-slate-900 font-medium" 
                            readOnly 
                            type="text" 
                            value={item.quantity}
                          />
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 px-2 hover:bg-slate-50 text-slate-600 transition-colors rounded-r-lg"
                          >
                            <span className="material-symbols-outlined text-sm font-bold">add</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex md:justify-end w-full md:w-auto justify-between items-center">
                        <span className="md:hidden text-sm text-slate-500">Total:</span>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-slate-900 font-bold">${formatCurrency(itemPrice * item.quantity)}</span>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="hidden md:flex text-slate-400 hover:text-red-500 transition-colors" 
                            title="Eliminar Artículo"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Resumen del Pedido</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <p className="text-slate-500 text-sm">Subtotal</p>
                    <p className="text-slate-900 font-medium">${formatCurrency(subtotal)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-slate-500 text-sm">Estimación de Envío</p>
                    <p className="text-slate-600 font-medium text-sm">Por validar</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-slate-500 text-sm">Impuestos (19%)</p>
                    <p className="text-slate-900 font-medium">${formatCurrency(estimatedTax)}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-900 text-lg font-bold">Total</p>
                      <p className="text-slate-900 text-2xl font-bold">${formatCurrency(cartTotal)}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">IVA incluido</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <span>Proceder al Pago</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm text-green-600">lock</span>
                    Procesamiento de Pedido Seguro
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-900">Finalizar Pedido</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Nombre Completo</span>
                  <input 
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="Nombre completo" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Tipo de documento</span>
                  <select 
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Seleccione...</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">Cédula de Extranjería</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Número de documento</span>
                  <input 
                    name="document_number"
                    value={formData.document_number}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="Número de identificación" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Teléfono de contacto</span>
                  <input 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="Ej: 300 123 4567" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Correo electrónico</span>
                  <input 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="ejemplo@correo.com" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Departamento</span>
                  <select 
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Seleccione departamento...</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Municipio</span>
                  <select 
                    name="municipality"
                    value={formData.municipality}
                    onChange={handleInputChange}
                    disabled={!formData.department}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Seleccione municipio...</option>
                    {formData.department && colombiaData[formData.department]?.map((mun) => (
                      <option key={mun} value={mun}>{mun}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <span className="text-slate-700 text-sm font-semibold">Dirección de residencia</span>
                  <input 
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                    placeholder="Ej: Calle 123 #45-67" 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className={`w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSubmitting ? (
                    <span className="size-6 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                  ) : (
                    <>
                      <span>Confirmar y Enviar a WhatsApp</span>
                      <span className="material-symbols-outlined">send</span>
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  Al confirmar, sus datos serán procesados para generar el pedido y enviarlo directamente a uno de nuestros asesores por WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
