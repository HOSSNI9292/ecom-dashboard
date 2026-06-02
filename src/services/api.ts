import type {
  CodinAfricaOrder,
  CodinAfricaWarehouse,
  AuthCredentials,
  Order,
  Product,
  CountryStats,
  DashboardStats,
  RevenuePoint,
  ApiResponse,
} from "@/types";
import { COUNTRY_NAMES, COUNTRY_FLAGS, COUNTRY_CURRENCIES, STATUS_MAP, DEFAULT_API_URL } from "@/utils";
import { getFeeForCountry, computeServiceFees } from "@/utils/fees";

const STORAGE_KEY = "cod_dashboard_credentials";

function getStoredCredentials(): AuthCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function getApiConfig(): AuthCredentials {
  const stored = getStoredCredentials();
  return {
    apiUrl: stored?.apiUrl || process.env.NEXT_PUBLIC_CODINAFRICA_API_URL || DEFAULT_API_URL,
    token: stored?.token || process.env.NEXT_PUBLIC_CODINAFRICA_TOKEN || "",
  };
}

export function saveCredentials(creds: AuthCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function buildHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", "X-Auth-Token": token };
}

function mapOrder(raw: CodinAfricaOrder): Order {
  const detail = raw.details?.[0];
  const product = detail?.product;
  return {
    id: raw._id,
    orderId: raw.id,
    customerName: raw.customer?.fullName || "Unknown",
    phone: raw.customer?.phone || "",
    country: raw.customer?.country || "",
    countryName: COUNTRY_NAMES[raw.customer?.country] || raw.customer?.country || "",
    status: STATUS_MAP[raw.status?.name] || raw.status?.name?.toLowerCase() || "unknown",
    statusColor: raw.status?.color || "#808080",
    date: raw.date || raw.createdAt,
    amount: raw.totalPrice || 0,
    productName: detail?.name || product?.name || "Unknown",
    productCode: product?.code?.[0] || "",
    quantity: detail?.quantity || 1,
    city: raw.customer?.city || "",
    source: raw.source,
    productImage: detail?.picture || product?.picture || "",
    productImages: product?.relatedPictures?.length ? product.relatedPictures : (detail?.picture || product?.picture ? [detail?.picture || product?.picture || ""] : []),
  };
}

function mapProduct(raw: CodinAfricaOrder): Product[] {
  if (!raw.details) return [];
  return raw.details.map((d) => {
    const p = d.product;
    const pd = p?.details?.[0];
    return {
      id: p?._id || d._id,
      name: d.name || p?.name || "Unknown",
      code: p?.code?.[0] || "",
      totalSold: d.quantity || 0,
      revenue: d.unitPrice * d.quantity || 0,
      stockQuantity: p?.quantity?.inStock ?? 0,
      warehouse: pd?.warehouse || "",
      country: pd?.country || raw.customer?.country || "",
      countryName: COUNTRY_NAMES[pd?.country || raw.customer?.country] || "",
      currency: pd?.currency || COUNTRY_CURRENCIES[raw.customer?.country] || "USD",
      image: d.picture || p?.picture,
      price: d.unitPrice || p?.price || 0,
    };
  });
}

class ApiService {
  private token: string;
  private apiUrl: string;
  private ordersCache: CodinAfricaOrder[] = [];
  private warehousesCache: CodinAfricaWarehouse[] = [];

  constructor() {
    const config = getApiConfig();
    this.token = config.token;
    this.apiUrl = config.apiUrl;
  }

  refreshConfig(): void {
    const config = getApiConfig();
    this.token = config.token;
    this.apiUrl = config.apiUrl;
    this.ordersCache = [];
    this.warehousesCache = [];
  }

  private async request<T>(endpoint: string): Promise<T> {
    if (!this.token) throw new Error("X-Auth-Token is required. Go to Settings to add your API token.");
    const url = `${this.apiUrl}${endpoint}`;
    const res = await fetch(url, { headers: buildHeaders(this.token) });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API Error (${res.status}): ${body.substring(0, 200)}`);
    }
    return res.json();
  }

  async fetchAllOrders(): Promise<CodinAfricaOrder[]> {
    const data = await this.request<ApiResponse<CodinAfricaOrder>>("/orders/search?limit=500");
    const orders = data?.content?.results || [];
    this.ordersCache = orders;
    return orders;
  }

  async fetchWarehouses(): Promise<CodinAfricaWarehouse[]> {
    const data = await this.request<ApiResponse<CodinAfricaWarehouse>>("/warehouses/search?limit=50");
    const warehouses = data?.content?.results || [];
    this.warehousesCache = warehouses;
    return warehouses;
  }

  async fetchAllData(): Promise<{
    orders: Order[];
    products: Product[];
    countries: CountryStats[];
    stats: DashboardStats;
    revenueTrend: RevenuePoint[];
  }> {
    const [rawOrders, warehouses] = await Promise.all([
      this.fetchAllOrders(),
      this.fetchWarehouses(),
    ]);

    const mappedOrders = rawOrders.map(mapOrder);
    const allProducts = rawOrders.flatMap(mapProduct);
    const stats = this.computeStats(mappedOrders, allProducts);
    const countries = this.computeCountries(mappedOrders, warehouses);
    const revenueTrend = this.computeRevenueTrend(mappedOrders);

    return { orders: mappedOrders, products: allProducts, countries, stats, revenueTrend };
  }

  private computeStats(orders: Order[], products: Product[]): DashboardStats {
    const total = orders.length;
    const revenue = orders.reduce((s, o) => s + o.amount, 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const outOfStock = orders.filter((o) => o.status === "out_of_stock").length;
    const double = orders.filter((o) => o.status === "double").length;
    const transferred = orders.filter((o) => o.status === "transferred").length;
    const confirmed = orders.filter((o) => o.status === "confirmed" || o.status === "delivered").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const nonCancelled = total - cancelled;

    const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "out_of_stock");
    const confirmedOrDelivered = nonCancelledOrders.filter(
      (o) => o.status === "confirmed" || o.status === "delivered"
    ).length;

    const uniqueProducts = new Set(products.map((p) => p.id)).size;

    const processedOrders = orders.filter((o) => o.status === "confirmed").length;
    const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "delivered").length;
    const processedRevenue = orders
      .filter((o) => o.status === "confirmed")
      .reduce((s, o) => s + o.amount, 0);
    const confirmedRevenue = orders
      .filter((o) => o.status === "confirmed" || o.status === "delivered")
      .reduce((s, o) => s + o.amount, 0);

    const deliverable = total - cancelled - outOfStock;
    const deliveryRate = deliverable > 0 ? processedOrders / deliverable : 0;

    let serviceFeesTotal = 0;
    for (const o of orders) {
      if (o.status === "confirmed") {
        const feePercent = getFeeForCountry(o.country);
        serviceFeesTotal += computeServiceFees(o.amount, feePercent);
      }
    }
    const netRevenue = processedRevenue - serviceFeesTotal;

    return {
      totalOrders: total,
      revenue,
      pendingOrders: pending,
      cancelledOrders: cancelled,
      outOfStockOrders: outOfStock,
      doubleOrders: double,
      transferredOrders: transferred,
      confirmedOrders: confirmedOrders,
      deliveredOrders: delivered,
      processedOrders,
      processedRevenue,
      confirmedRevenue,
      netRevenue,
      serviceFeesTotal,
      confirmationRate: nonCancelled > 0 ? confirmed / nonCancelled : 0,
      deliveryRate,
      totalProducts: uniqueProducts,
      averageOrderValue: total > 0 ? revenue / total : 0,
    };
  }

  private computeCountries(orders: Order[], warehouses: CodinAfricaWarehouse[]): CountryStats[] {
    const map = new Map<
      string,
      {
        revenue: number;
        orders: number;
        confirmed: number;
        pending: number;
        cancelled: number;
        outOfStock: number;
        processedOrders: number;
        processedRevenue: number;
      }
    >();

    for (const o of orders) {
      const c = o.country || "XX";
      if (!map.has(c))
        map.set(c, { revenue: 0, orders: 0, confirmed: 0, pending: 0, cancelled: 0, outOfStock: 0, processedOrders: 0, processedRevenue: 0 });
      const entry = map.get(c)!;
      entry.revenue += o.amount;
      entry.orders += 1;
      if (o.status === "pending") entry.pending += 1;
      else if (o.status === "cancelled") entry.cancelled += 1;
      else if (o.status === "out_of_stock") entry.outOfStock += 1;
      else if (o.status === "confirmed" || o.status === "delivered") entry.confirmed += 1;
      if (o.status === "confirmed") {
        entry.processedOrders += 1;
        entry.processedRevenue += o.amount;
      }
    }

    const warehouseMap = new Map(warehouses.map((w) => [w.country, w]));

    return Array.from(map.entries()).map(([code, data]) => {
      const w = warehouseMap.get(code);
      const totalNonCancelled = data.orders - data.cancelled - data.outOfStock;
      const feePercent = getFeeForCountry(code);
      const serviceFees = computeServiceFees(data.processedRevenue, feePercent);
      const netRevenue = data.processedRevenue - serviceFees;
      const deliverable = data.orders - data.cancelled - data.outOfStock;
      return {
        country: code,
        countryName: w?.countryName || COUNTRY_NAMES[code] || code,
        flag: w?.flag || COUNTRY_FLAGS[code] || "",
        currency: w?.currency || COUNTRY_CURRENCIES[code] || "USD",
        ...data,
        grossRevenue: data.processedRevenue,
        feePercent,
        serviceFees,
        netRevenue,
        confirmationRate: totalNonCancelled > 0 ? data.confirmed / totalNonCancelled : 0,
        deliveryRate: deliverable > 0 ? data.processedOrders / deliverable : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  private computeRevenueTrend(orders: Order[]): RevenuePoint[] {
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const day = o.date?.substring(0, 10);
      if (!day) continue;
      if (!dayMap.has(day)) dayMap.set(day, { revenue: 0, orders: 0 });
      const entry = dayMap.get(day)!;
      entry.revenue += o.amount;
      entry.orders += 1;
    }
    return Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async validateCredentials(creds: AuthCredentials): Promise<boolean> {
    try {
      const res = await fetch(`${creds.apiUrl}/orders/search?limit=1`, {
        headers: buildHeaders(creds.token),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
