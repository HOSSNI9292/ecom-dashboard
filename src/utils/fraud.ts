const FRAUD_STORAGE_KEY = "fraud_flagged_products";

export interface FraudFlag {
  productCode: string;
  productName: string;
  flaggedAt: string;
  reason: string;
}

export function getFlaggedProducts(): FraudFlag[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FRAUD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function flagProduct(productCode: string, productName: string, reason: string): void {
  const flagged = getFlaggedProducts();
  const existing = flagged.findIndex((f) => f.productCode === productCode);
  const newFlag: FraudFlag = {
    productCode,
    productName,
    flaggedAt: new Date().toISOString(),
    reason,
  };
  if (existing >= 0) {
    flagged[existing] = newFlag;
  } else {
    flagged.push(newFlag);
  }
  localStorage.setItem(FRAUD_STORAGE_KEY, JSON.stringify(flagged));
}

export function unflagProduct(productCode: string): void {
  const flagged = getFlaggedProducts().filter((f) => f.productCode !== productCode);
  localStorage.setItem(FRAUD_STORAGE_KEY, JSON.stringify(flagged));
}

export function isProductFlagged(productCode: string): boolean {
  return getFlaggedProducts().some((f) => f.productCode === productCode);
}
