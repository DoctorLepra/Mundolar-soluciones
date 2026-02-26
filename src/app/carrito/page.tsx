'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();

  const taxes = cartTotal * 0.19; // Example tax calculation if total doesn't include it, 
  // but our cartTotal already uses price_with_iva. 
  // Let's assume the price_with_iva IS the final price.
  // The HTML showed "Impuestos (Estimado)" separate.
  // If cartTotal is with IVA, then Subtotal = Total / 1.19
  const subtotal = cartTotal / 1.19;
  const estimatedTax = cartTotal - subtotal;

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
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-primary/25"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background-light min-h-screen">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
          <Link href="/" className="text-slate-500 hover:text-primary transition-colors">Inicio</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-medium">Carrito</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Tu Carrito ({cartCount} {cartCount === 1 ? 'Artículo' : 'Artículos'})
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full">
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
            
            <div className="mt-6 flex justify-between items-center">
              <Link href="/catalogo" className="flex items-center gap-2 text-primary hover:text-blue-700 font-medium text-sm transition-colors">
                <span className="material-symbols-outlined text-lg">arrow_back</span> Continuar Comprando
              </Link>
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
                    <p className="text-green-600 font-medium text-sm">Gratis</p>
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
                
                <div className="mb-6">
                  <div className="relative flex items-center">
                    <input className="w-full rounded-lg border-slate-300 bg-slate-50 text-sm text-slate-900 focus:ring-primary focus:border-primary pr-20 py-2.5" placeholder="Código promocional" type="text"/>
                    <button className="absolute right-1 top-1 bottom-1 px-3 text-xs font-bold text-primary hover:bg-primary/10 rounded transition-colors uppercase">Aplicar</button>
                  </div>
                </div>
                
                <button className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                  <span>Proceder al Pago</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm text-green-600">lock</span>
                    Pago Seguro Encriptado SSL
                  </div>
                  <div className="flex gap-3 opacity-60">
                    <span className="material-symbols-outlined text-2xl">credit_card</span>
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
