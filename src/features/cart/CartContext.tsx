import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import type { Product, Variant } from "@/types/catalog";

export interface CartLine {
  /** `${productId}-${variantKey}` */
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  selectedWeight?: number | null;
  selectedUnit?: string | null;
}

type Action =
  | { type: "add"; line: CartLine }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "replace"; lines: CartLine[] };

const STORAGE_KEY = "pb_cart";
const MAX_QUANTITY = 99;

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const existing = lines.find((l) => l.id === action.line.id);
      if (!existing) return [...lines, action.line];
      return lines.map((l) =>
        l.id === action.line.id
          ? // Refresh name/price/image so a stale saved cart picks up catalog changes.
            { ...action.line, quantity: Math.min(MAX_QUANTITY, l.quantity + action.line.quantity) }
          : l,
      );
    }
    case "setQuantity":
      if (action.quantity <= 0) return lines.filter((l) => l.id !== action.id);
      return lines.map((l) =>
        l.id === action.id ? { ...l, quantity: Math.min(MAX_QUANTITY, action.quantity) } : l,
      );
    case "remove":
      return lines.filter((l) => l.id !== action.id);
    case "clear":
      return [];
    case "replace":
      return action.lines;
  }
}

function loadCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => l && typeof l.id === "string" && typeof l.price === "number" && l.quantity > 0,
    );
  } catch {
    return [];
  }
}

export const cartLineId = (product: Product, variant: Variant) => `${product.id}-${variant.key}`;

/** Cart display name, e.g. "Walnut Brownies (Eggless) (2 pcs)". */
function lineName(product: Product, variant: Variant) {
  const category = (product.categoryName ?? "").toLowerCase();
  const dietTag = category.includes("brownie")
    ? category.includes("eggless")
      ? " (Eggless)"
      : " (Regular)"
    : "";
  return `${product.name}${dietTag}${variant.label ? ` (${variant.label})` : ""}`;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (product: Product, variant: Variant, quantity?: number) => CartLine;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  quantityOf: (id: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, undefined, loadCart);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage can be unavailable (private mode); the cart still works in memory.
    }
  }, [lines]);

  // Keep carts in sync across tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      dispatch({ type: "replace", lines: loadCart() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((product: Product, variant: Variant, quantity = 1) => {
    const line: CartLine = {
      id: cartLineId(product, variant),
      name: lineName(product, variant),
      price: variant.price,
      quantity,
      image: product.image,
      selectedWeight: variant.weight,
      selectedUnit: variant.unit,
    };
    dispatch({ type: "add", line });
    return line;
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const quantities = new Map(lines.map((l) => [l.id, l.quantity]));
    return {
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      isOpen,
      setOpen,
      add,
      setQuantity: (id, quantity) => dispatch({ type: "setQuantity", id, quantity }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
      quantityOf: (id) => quantities.get(id) ?? 0,
    };
  }, [lines, isOpen, add]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
