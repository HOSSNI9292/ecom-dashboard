"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Save, Package, Plus, Trash2, Download, AlertCircle, DollarSign } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useProductCosts } from "@/hooks/useProductCosts";
import { useDashboardData } from "@/hooks";
import type { ProductCost } from "@/hooks/useProductCosts";

const inputClass = "w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg text-white text-xs focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 transition-all duration-200 px-2 py-1.5";
const labelClass = "block text-[#94A3B8] text-[10px] font-medium mb-0.5";

export default function ProductCostsSettingsPage() {
  const { t } = useTranslation();
  const { costs, dirty, updateCost, upsertCost, removeCost, save, importFromProducts } = useProductCosts();
  const { data: dashData } = useDashboardData();
  const [saved, setSaved] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  const products = dashData?.products ?? [];
  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.code || p.name, { code: p.code || p.name, name: p.name }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = useCallback(() => {
    save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [save]);

  const handleImport = useCallback(() => {
    importFromProducts(uniqueProducts);
  }, [importFromProducts, uniqueProducts]);

  const handleAdd = useCallback(() => {
    if (!newCode && !newName) return;
    upsertCost({
      productCode: newCode || newName,
      productName: newName || newCode,
      costOfGoods: 0,
      shippingCost: 0,
      codFee: 0,
      upsellCost: 0,
    });
    setNewCode("");
    setNewName("");
  }, [newCode, newName, upsertCost]);

  const totalConfigured = costs.length;
  const totalProducts = uniqueProducts.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#6366F1]/10">
                <Package className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <CardTitle>Product Cost Settings</CardTitle>
                <p className="text-[#64748B] text-xs mt-0.5">
                  Configure per-product costs in USD for accurate profit calculations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-white hover:bg-[#111827] border border-[#1F2937]/80 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Import from products
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-[#6366F1] hover:bg-[#5558E6] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        </CardHeader>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-[#64748B] text-xs mb-4">
            <span>{totalConfigured} configured</span>
            <span className="w-1 h-1 rounded-full bg-[#1F2937]" />
            <span>{totalProducts} products in system</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F2937]/80">
                  <th className="text-left text-[#64748B] text-[10px] font-medium uppercase tracking-wider pb-2 pr-2">Product</th>
                  <th className="text-right text-[#64748B] text-[10px] font-medium uppercase tracking-wider pb-2 px-2 min-w-[90px]">Cost of Goods</th>
                  <th className="text-right text-[#64748B] text-[10px] font-medium uppercase tracking-wider pb-2 px-2 min-w-[90px]">Shipping</th>
                  <th className="text-right text-[#64748B] text-[10px] font-medium uppercase tracking-wider pb-2 px-2 min-w-[90px]">COD Fee</th>
                  <th className="text-right text-[#64748B] text-[10px] font-medium uppercase tracking-wider pb-2 px-2 min-w-[90px]">Upsell Cost</th>
                  <th className="w-10 pb-2 pl-2" />
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.productCode} className="border-b border-[#1F2937]/40 hover:bg-[#111827]/50 transition-colors">
                    <td className="py-2 pr-2">
                      <div className="min-w-0">
                        <input
                          type="text"
                          value={c.productName}
                          onChange={(e) => updateCost(c.productCode, "productName", e.target.value)}
                          className="bg-transparent text-white text-sm font-medium w-full focus:outline-none focus:text-[#6366F1]"
                        />
                        <span className="text-[#64748B] text-[10px]">{c.productCode}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B] text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={c.costOfGoods || ""}
                          onChange={(e) => updateCost(c.productCode, "costOfGoods", e.target.value)}
                          className={inputClass + " pl-5 text-right"}
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B] text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={c.shippingCost || ""}
                          onChange={(e) => updateCost(c.productCode, "shippingCost", e.target.value)}
                          className={inputClass + " pl-5 text-right"}
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B] text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={c.codFee || ""}
                          onChange={(e) => updateCost(c.productCode, "codFee", e.target.value)}
                          className={inputClass + " pl-5 text-right"}
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#64748B] text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={c.upsellCost || ""}
                          onChange={(e) => updateCost(c.productCode, "upsellCost", e.target.value)}
                          className={inputClass + " pl-5 text-right"}
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => removeCost(c.productCode)}
                        className="p-1 rounded text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {costs.length === 0 && (
            <div className="py-8 text-center">
              <Package className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
              <p className="text-[#64748B] text-sm">No product costs configured yet</p>
              <p className="text-[#475569] text-xs mt-1">Click "Import from products" or add manually below</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="border-t border-[#1F2937]/60 pt-4">
            <p className="text-[#94A3B8] text-xs font-medium mb-2 flex items-center gap-1.5">
              <Plus className="w-3 h-3" />
              Add product manually
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Product Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. SWP-001"
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Product Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Smart Watch Pro"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!newCode && !newName}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#6366F1]/20 text-[#6366F1] hover:bg-[#6366F1]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
