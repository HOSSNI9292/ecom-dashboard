"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Save, RotateCcw, DollarSign, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCountryFees, saveCountryFees, resetCountryFees } from "@/utils/fees";
import { COUNTRY_NAMES, COUNTRY_FLAGS, FIXED_COUNTRY_FEES, DEFAULT_FIXED_FEE } from "@/utils/constants";
import { formatCurrency } from "@/utils";
import type { CountryFeeConfig } from "@/types";

const ALL_COUNTRIES = [
  "GA", "ML", "CG", "CI", "BF", "TG", "NE", "BJ", "SN", "TD", "GN", "CD",
];

export default function FeesSettingsPage() {
  const { t } = useTranslation();
  const [fees, setFees] = useState<CountryFeeConfig>({});
  const [otherFee, setOtherFee] = useState(DEFAULT_FIXED_FEE);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getCountryFees();
    setFees(stored);
    setOtherFee(stored.XX ?? DEFAULT_FIXED_FEE);
    setLoaded(true);
  }, []);

  const handleChange = useCallback((code: string, value: number) => {
    setFees((prev) => ({ ...prev, [code]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const toSave = { ...fees };
    if (!toSave.XX) toSave.XX = otherFee;
    saveCountryFees(toSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [fees, otherFee]);

  const handleReset = useCallback(() => {
    resetCountryFees();
    const defaults = getCountryFees();
    setFees(defaults);
    setOtherFee(defaults.XX ?? DEFAULT_FIXED_FEE);
  }, []);

  const inputClass = "w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg text-white text-center focus:outline-none focus:border-[#6366F1]/50 focus:ring-1 focus:ring-[#6366F1]/20 transition-all duration-200 text-sm px-2 py-2";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#6366F1]/10">
              <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <CardTitle>{t("fees.title")}</CardTitle>
          </div>
          <p className="text-[#64748B] text-xs mt-1">
            {t("fees.description")}
          </p>
        </CardHeader>
        {!loaded ? (
          <div className="py-12 flex justify-center">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-[#1F2937] rounded-full" />
              <div className="w-8 h-8 border-2 border-transparent border-t-[#6366F1] rounded-full animate-spin absolute inset-0" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_COUNTRIES.map((code) => {
                const isFixed = code in FIXED_COUNTRY_FEES;
                return (
                  <div
                    key={code}
                    className={`flex items-center gap-3 p-4 rounded-xl bg-[#0B0F19] border transition-all duration-200 ${
                      isFixed ? "border-[#6366F1]/20" : "border-[#1F2937] hover:border-[#6366F1]/20"
                    }`}
                  >
                    {COUNTRY_FLAGS[code] && (
                      <img src={COUNTRY_FLAGS[code]} alt={code} className="w-7 h-5 rounded shadow-sm object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{COUNTRY_NAMES[code] || code}</p>
                      <p className="text-[#64748B] text-xs">{code}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={fees[code] ?? DEFAULT_FIXED_FEE}
                        onChange={(e) => handleChange(code, parseInt(e.target.value) || 0)}
                        className={inputClass + " w-20"}
                      />
                      <span className="text-[#64748B] text-xs w-6">XOF</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] border-dashed">
              <Globe className="w-5 h-5 text-[#64748B] shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{t("fees.otherCountries")}</p>
                <p className="text-[#64748B] text-xs">{t("fees.otherDesc")}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={otherFee}
                  onChange={(e) => setOtherFee(parseInt(e.target.value) || 0)}
                  className={inputClass + " w-20"}
                />
                <span className="text-[#64748B] text-xs w-6">XOF</span>
              </div>
            </div>

            <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4">
              <p className="text-[#64748B] text-xs font-medium mb-2">{t("fees.examples")}</p>
              <div className="space-y-1.5 text-xs text-[#94A3B8]">
                <p>Gabon (GA): <span className="text-white">{formatCurrency(6500)}</span> {t("fees.perProcessedOrder")}</p>
                <p>Congo Brazzaville (CG): <span className="text-white">{formatCurrency(5000)}</span> {t("fees.perProcessedOrder")}</p>
                <p>Mali (ML): <span className="text-white">{formatCurrency(5000)}</span> {t("fees.perProcessedOrder")}</p>
                <p>Côte d'Ivoire (CI): <span className="text-white">{formatCurrency(5000)}</span> {t("fees.perProcessedOrder")}</p>
                <p>Burkina Faso (BF): <span className="text-white">{formatCurrency(5000)}</span> {t("fees.perProcessedOrder")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-[0_0_16px_rgba(99,102,241,0.2)] hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]"
              >
                {saved ? t("fees.saved") : t("fees.saveFees")}
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#111827] border border-[#1F2937] hover:border-[#6366F1]/30 text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" /> {t("fees.resetDefaults")}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
