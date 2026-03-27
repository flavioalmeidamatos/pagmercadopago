"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { toast } from "sonner";
import type { CartItem, Product } from "@/types/domain";

type CartContextValue = {
  items: CartItem[];
  favorites: string[];
  addItem: (product: Product, quantity?: number) => void;
  buyNow: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  subtotal: number;
  itemsCount: number;
};

const CART_KEY = "lumina-cart";
const FAVORITES_KEY = "lumina-favorites";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const cart = window.localStorage.getItem(CART_KEY);
      return cart ? (JSON.parse(cart) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const storedFavorites = window.localStorage.getItem(FAVORITES_KEY);
      return storedFavorites ? (JSON.parse(storedFavorites) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addItem = (product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          price: product.price,
          image: product.images[0]?.image_url ?? "",
          quantity
        }
      ];
    });

    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const buyNow = (product: Product) => {
    addItem(product, 1);
    window.location.href = "/cart";
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(quantity, 1) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setItems([]);

  const toggleFavorite = (productId: string) => {
    setFavorites((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      toast.success(
        current.includes(productId)
          ? "Produto removido dos favoritos"
          : "Produto salvo nos favoritos"
      );

      return next;
    });
  };

  const value = {
    items,
    favorites,
    addItem,
    buyNow,
    removeItem,
    updateQuantity,
    clearCart,
    toggleFavorite,
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    itemsCount: items.reduce((total, item) => total + item.quantity, 0)
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

