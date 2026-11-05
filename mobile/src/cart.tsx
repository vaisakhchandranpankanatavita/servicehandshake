import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Product = { id: number; name: string; seller: string; price: number; oldPrice: number; category: string; img: string; blurb?: string };
type Line = { product: Product; qty: number };
type Ctx = { lines: Line[]; count: number; subtotal: number; add: (p: Product) => void; setQty: (id: number, q: number) => void; clear: () => void };
const C = createContext<Ctx>(null as any);
export const useCart = () => useContext(C);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const add = useCallback((product: Product) => setLines((l) => l.some((x) => x.product.id === product.id)
    ? l.map((x) => (x.product.id === product.id ? { ...x, qty: Math.min(20, x.qty + 1) } : x))
    : [...l, { product, qty: 1 }]), []);
  const setQty = useCallback((id: number, q: number) => setLines((l) => (q <= 0
    ? l.filter((x) => x.product.id !== id)
    : l.map((x) => (x.product.id === id ? { ...x, qty: Math.min(20, q) } : x)))), []);
  const clear = useCallback(() => setLines([]), []);
  const v = useMemo(() => ({
    lines, add, setQty, clear,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.product.price, 0),
  }), [lines, add, setQty, clear]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
