import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  item_id: string;
  vendor_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
  addItem: (item: CartItem, vName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "zteeel_cart";

function readStorage(): any {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  } catch {}
  return null;
}

function writeStorage(data: any) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(CART_KEY, JSON.stringify(data));
    }
  } catch {}
}

function clearStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(CART_KEY);
    }
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);

  useEffect(() => {
    const saved = readStorage();
    if (saved) {
      setItems(saved.items || []);
      setVendorId(saved.vendorId || null);
      setVendorName(saved.vendorName || null);
    }
  }, []);

  const persist = (i: CartItem[], vid: string | null, vname: string | null) => {
    writeStorage({ items: i, vendorId: vid, vendorName: vname });
  };

  const addItem = (item: CartItem, vName: string) => {
    if (vendorId && vendorId !== item.vendor_id) {
      const newItems = [{ ...item, quantity: 1 }];
      setItems(newItems);
      setVendorId(item.vendor_id);
      setVendorName(vName);
      persist(newItems, item.vendor_id, vName);
      return;
    }
    setVendorId(item.vendor_id);
    setVendorName(vName);
    setItems((prev) => {
      const existing = prev.find((i) => i.item_id === item.item_id);
      const updated = existing
        ? prev.map((i) => (i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...item, quantity: 1 }];
      persist(updated, item.vendor_id, vName);
      return updated;
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.item_id !== itemId);
      if (updated.length === 0) {
        setVendorId(null);
        setVendorName(null);
        clearStorage();
      } else {
        persist(updated, vendorId, vendorName);
      }
      return updated;
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return; }
    setItems((prev) => {
      const updated = prev.map((i) => (i.item_id === itemId ? { ...i, quantity: qty } : i));
      persist(updated, vendorId, vendorName);
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    setVendorId(null);
    setVendorName(null);
    clearStorage();
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, vendorId, vendorName, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
