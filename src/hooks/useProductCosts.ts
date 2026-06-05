"use client";

import { useState, useEffect, useCallback } from "react";

export interface ProductCost {
  productCode: string;
  productName: string;
  costOfGoods: number;
  shippingCost: number;
  codFee: number;
  upsellCost: number;
}

const STORAGE_KEY = "cod_product_costs";

function loadCosts(): ProductCost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCosts(costs: ProductCost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
}

export function getProductCosts(): ProductCost[] {
  return loadCosts();
}

export function getCostForProduct(codeOrName: string): ProductCost | undefined {
  const costs = loadCosts();
  return costs.find((c) => c.productCode === codeOrName || c.productName === codeOrName);
}

export function useProductCosts() {
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCosts(loadCosts());
  }, []);

  const persist = useCallback((updated: ProductCost[]) => {
    setCosts(updated);
    saveCosts(updated);
    setDirty(false);
  }, []);

  const updateCost = useCallback((code: string, field: keyof ProductCost, value: string | number) => {
    setCosts((prev) => {
      const next = prev.map((c) =>
        c.productCode === code ? { ...c, [field]: field === "productName" ? String(value) : Number(value) || 0 } : c
      );
      setDirty(true);
      return next;
    });
  }, []);

  const upsertCost = useCallback((cost: ProductCost) => {
    setCosts((prev) => {
      const idx = prev.findIndex((c) => c.productCode === cost.productCode);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? cost : c))
        : [...prev, cost];
      setDirty(true);
      return next;
    });
  }, []);

  const removeCost = useCallback((code: string) => {
    setCosts((prev) => {
      const next = prev.filter((c) => c.productCode !== code);
      setDirty(true);
      return next;
    });
  }, []);

  const save = useCallback(() => {
    saveCosts(costs);
    setDirty(false);
  }, [costs]);

  const importFromProducts = useCallback((products: { code: string; name: string }[]) => {
    setCosts((prev) => {
      const existing = new Map(prev.map((c) => [c.productCode, c]));
      for (const p of products) {
        if (!existing.has(p.code)) {
          existing.set(p.code, {
            productCode: p.code || p.name,
            productName: p.name,
            costOfGoods: 0,
            shippingCost: 0,
            codFee: 0,
            upsellCost: 0,
          });
        }
      }
      setDirty(true);
      return Array.from(existing.values());
    });
  }, []);

  return { costs, dirty, updateCost, upsertCost, removeCost, save, importFromProducts, setCosts: persist };
}
