import { COUNTRY_FEES_STORAGE_KEY, DEFAULT_COUNTRY_FEES, OTHER_COUNTRY_FEE } from "./constants";
import type { CountryFeeConfig } from "@/types";

export function getCountryFees(): CountryFeeConfig {
  if (typeof window === "undefined") return DEFAULT_COUNTRY_FEES;
  try {
    const stored = localStorage.getItem(COUNTRY_FEES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_COUNTRY_FEES;
  } catch {
    return DEFAULT_COUNTRY_FEES;
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
  return fees[countryCode] ?? OTHER_COUNTRY_FEE;
}

export function computeServiceFees(revenue: number, feePercent: number): number {
  return Math.round(revenue * (feePercent / 100));
}

export function computeNetRevenue(revenue: number, feePercent: number): number {
  return revenue - computeServiceFees(revenue, feePercent);
}
