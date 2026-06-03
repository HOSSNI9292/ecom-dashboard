"use client";

import { useState, useEffect, useCallback } from "react";
import { DollarSign, Globe, Save, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCountryFees, saveCountryFees, computeServiceFees, COUNTRY_NAMES, FIXED_COUNTRY_FEES, DEFAULT_FIXED_FEE } from "@/utils";


const ALL_COUNTRIES = Object.keys(COUNTRY_NAMES).filter((c) => c !== "SN" && c !== "GN" && c !== "CD");

export default function FeesSettingsPage() {
  const [fees, setFees] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [defaultFee, setDefaultFee] = useState(DEFAULT_FIXED_FEE);

  useEffect(() => {
    const stored = getCountryFees();
    setFees({ ...FIXED_COUNTRY_FEES, ...stored });
    const d = stored._default || DEFAULT_FIXED_FEE;
    setDefaultFee(d);
  }, []);

  const updateFee = (country: string, val: string) => {
    const n = parseInt(val) || 0;
    setFees((f) => ({ ...f, [country]: n }));
  };
  const updateDefault = (val: string) => {
    const n = parseInt(val) || 0;
    setDefaultFee(n);
  };

  const handleSave = useCallback(() => {
    saveCountryFees({ ...fees, _default: defaultFee });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [fees, defaultFee]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-[#71717A] hover:text-[#FAFAFA] text-sm transition-colors duration-200">
        <ArrowLeft className="w-4 h-4" /> Back to Settings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#10B981]/10">
              <DollarSign className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <CardTitle>Country Service Fees</CardTitle>
              <p className="text-[#71717A] text-xs mt-1">
                Fixed fee per processed order per country. Used for net revenue calculations.
              </p>
            </div>
          </div>
        </CardHeader>
        <div className="space-y-3">
          {ALL_COUNTRIES.map((code) => {
            const fee = fees[code] ?? FIXED_COUNTRY_FEES[code] ?? defaultFee;
            const isFixed = FIXED_COUNTRY_FEES[code] !== undefined;
            return (
              <div
                key={code}
                className={`flex items-center gap-3 p-4 rounded-xl bg-[#0A0A0B] border transition-all duration-200 ${
                  isFixed ? "border-[#10B981]/20" : "border-[#27272A] hover:border-[#10B981]/20"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10B981]/10 to-[#0EA5E9]/10 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#34D399]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#FAFAFA] text-sm font-medium">{COUNTRY_NAMES[code as keyof typeof COUNTRY_NAMES]}</p>
                  <p className="text-[#71717A] text-xs">{code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => updateFee(code, e.target.value)}
                    className="w-24 bg-[#141417] border border-[#27272A] rounded-xl text-[#FAFAFA] text-center focus:outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/20 transition-all duration-200 text-sm px-2 py-2"
                    min={0}
                    step={100}
                  />
                  <span className="text-[#71717A] text-xs w-6">XOF</span>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0A0A0B] border border-[#27272A] border-dashed">
            <Globe className="w-5 h-5 text-[#71717A] shrink-0" />
            <div className="flex-1">
              <p className="text-[#FAFAFA] text-sm font-medium">Default Fee</p>
              <p className="text-[#71717A] text-xs">Default fee per processed order for unlisted countries</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={defaultFee}
                onChange={(e) => updateDefault(e.target.value)}
                className="w-24 bg-[#141417] border border-[#27272A] rounded-xl text-[#FAFAFA] text-center focus:outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/20 transition-all duration-200 text-sm px-2 py-2"
                min={0}
                step={100}
              />
              <span className="text-[#71717A] text-xs w-6">XOF</span>
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4">
            <p className="text-[#71717A] text-xs font-medium mb-2">Examples</p>
            <div className="space-y-1.5 text-xs text-[#A1A1AA]">
              <p>• Gabon (GA): 6,500 XOF/order — fixed by CodinAfrica</p>
              <p>• Other countries: 5,000 XOF/order — default rate</p>
              <p>• Total fees = sum of (processed orders × fee) for each country</p>
              <p>• Net Revenue = Processed Revenue − Total Service Fees</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/30"
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Fee Settings"}
          </button>
        </div>
      </Card>
    </div>
  );
}
