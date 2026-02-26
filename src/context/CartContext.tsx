'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  price_with_iva: number | null;
  image_url: string;
  quantity: number;
  brand_name?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('mundolar_cart');
    if (savedData) {
      try {
        const { items, timestamp } = JSON.parse(savedData);
        const now = new Date().getTime();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (now - timestamp < expirationTime) {
          setCart(items);
        } else {
          localStorage.removeItem('mundolar_cart');
        }
      } catch (e) {
        console.error('Error parsing cart from localStorage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      const dataToSave = {
        items: cart,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('mundolar_cart', JSON.stringify(dataToSave));
    }
  }, [cart, isLoaded]);

  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      const imageUrls = typeof product.image_urls === 'string' 
        ? JSON.parse(product.image_urls) 
        : (product.image_urls || []);
      
      const newEntry: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        price_with_iva: product.price_with_iva,
        image_url: imageUrls.length > 0 ? imageUrls[0] : `https://picsum.photos/400/300?random=${product.id}`,
        quantity: 1,
        brand_name: product.brands?.name || (Array.isArray(product.brands) ? product.brands[0]?.name : 'Marca')
      };
      
      return [...prevCart, newEntry];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => {
    const price = item.price_with_iva || (item.price * 1.19);
    return total + (price * item.quantity);
  }, 0);

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
