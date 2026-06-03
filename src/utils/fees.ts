import { COUNTRY_FEES_STORAGE_KEY, FIXED_COUNTRY_FEES, DEFAULT_FIXED_FEE } from "./constants";
import type { CountryFeeConfig } from "@/types";

export function getCountryFees(): CountryFeeConfig {
  if (typeof window === "undefined") return FIXED_COUNTRY_FEES;
  try {
    const stored = localStorage.getItem(COUNTRY_FEES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : FIXED_COUNTRY_FEES;
  } catch {
    return FIXED_COUNTRY_FEES;
  }
}

export function saveCountryFees(fees: CountryFeeConfig): void {
  localStorage.setItem(COUNTRY_FEES_STORAGE_KEY, JSON.stringify(fees));
}

export function resetCountryFees(): void {
  localStorage.removeItem(COUNTRY_FEES_STORAGE_KEY);
}

export function getFeeForCountry(countryCode: string): number {
  const fees = getCountryFees();
  return fees[countryCode] ?? DEFAULT_FIXED_FEE;
}

export function computeServiceFees(processedCount: number, feePerOrder: number): number {
  return processedCount * feePerOrder;
}

export function computeNetRevenue(revenue: number, feePerOrder: number, processedCount: number): number {
  return revenue - computeServiceFees(processedCount, feePerOrder);
}
