"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, DollarSign, Globe } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCountryFees, saveCountryFees, resetCountryFees } from "@/utils/fees";
import { COUNTRY_NAMES, COUNTRY_FLAGS, OTHER_COUNTRY_FEE } from "@/utils/constants";
import type { CountryFeeConfig } from "@/types";

const ALL_COUNTRIES = [
  "GA", "ML", "CG", "CI", "BF", "TG", "NE", "BJ", "SN", "TD", "GN", "CD",
];

export default function FeesSettingsPage() {
  const [fees, setFees] = useState<CountryFeeConfig>({});
  const [otherFee, setOtherFee] = useState(OTHER_COUNTRY_FEE);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = getCountryFees();
    setFees(stored);
    setOtherFee(stored.XX ?? OTHER_COUNTRY_FEE);
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
    setOtherFee(defaults.XX ?? OTHER_COUNTRY_FEE);
  }, []);

  const inputClass = "w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg text-white text-center focus:outline-none focus:border-[#06B6D4]/50 focus:ring-1 focus:ring-[#06B6D4]/20 transition-all duration-200 text-sm px-2 py-2";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card hover={false}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#06B6D4]/10">
              <DollarSign className="w-5 h-5 text-[#22D3EE]" />
            </div>
            <CardTitle>Country Service Fees</CardTitle>
          </div>
          <p className="text-[#606060] text-xs mt-1">
            Set CodinAfrica service fee percentage per country. Fees are deducted from Processed (Confirmed) revenue.
          </p>
        </CardHeader>
        {!loaded ? (
          <div className="py-12 flex justify-center">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-[#1F1F1F] rounded-full" />
              <div className="w-8 h-8 border-2 border-transparent border-t-[#06B6D4] rounded-full animate-spin absolute inset-0" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_COUNTRIES.map((code) => (
                <div
                  key={code}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F] hover:border-[#06B6D4]/20 transition-all duration-200"
                >
                  {COUNTRY_FLAGS[code] && (
                    <img src={COUNTRY_FLAGS[code]} alt={code} className="w-7 h-5 rounded shadow-sm object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{COUNTRY_NAMES[code] || code}</p>
                    <p className="text-[#606060] text-xs">{code}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={fees[code] ?? OTHER_COUNTRY_FEE}
                      onChange={(e) => handleChange(code, parseFloat(e.target.value) || 0)}
                      className={inputClass + " w-16"}
                    />
                    <span className="text-[#606060] text-sm w-4">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F] border-dashed">
              <Globe className="w-5 h-5 text-[#606060] shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Other Countries</p>
                <p className="text-[#606060] text-xs">Default fee for unlisted countries</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={otherFee}
                  onChange={(e) => setOtherFee(parseFloat(e.target.value) || 0)}
                  className={inputClass + " w-16"}
                />
                <span className="text-[#606060] text-sm w-4">%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-[0_0_16px_rgba(6,182,212,0.2)] hover:shadow-[0_0_24px_rgba(6,182,212,0.3)]"
              >
                {saved ? "Saved!" : "Save Fees"}
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#111111] border border-[#1F1F1F] hover:border-[#06B6D4]/30 text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" /> Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
