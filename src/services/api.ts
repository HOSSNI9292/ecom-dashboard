import type {
  CodinAfricaOrder,
  CodinAfricaShipping,
  CodinAfricaWarehouse,
  AuthCredentials,
  Order,
  Product,
  CountryStats,
  DashboardStats,
  RevenuePoint,
  ApiResponse,
} from "@/types";
import { COUNTRY_NAMES, COUNTRY_FLAGS, COUNTRY_CURRENCIES, STATUS_MAP, DEFAULT_API_URL, toParisDate } from "@/utils";
import { getFeeForCountry, computeServiceFees } from "@/utils/fees";

const STORAGE_KEY = "cod_dashboard_credentials";

const MOCK_ORDERS: CodinAfricaOrder[] = [
  {
    _id: "1", id: "ORD-001", customer: { fullName: "Ahmed Benali", phone: "+212612345678", country: "MA", city: "Casablanca" },
    status: { _id: "s1", name: "Delivered", color: "#10b981" }, date: "2026-06-01T10:00:00Z", createdAt: "2026-06-01T10:00:00Z", updatedAt: "2026-06-01T10:00:00Z",
    totalPrice: 450, source: "website",
    details: [{ _id: "d1", name: "Smart Watch Pro", quantity: 1, unitPrice: 450, picture: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200", product: { _id: "p1", name: "Smart Watch Pro", code: ["SWP-001"], price: 450, picture: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200", relatedPictures: [], quantity: { inStock: 45, defective: 0, total: 45 }, details: [{ warehouse: "WH-MA", country: "MA", currency: "MAD", price: 450, quantity: { total: 45, inStock: 45, defective: 0, stockAll: 45, expedition: 0 } }] } }],
  },
  {
    _id: "2", id: "ORD-002", customer: { fullName: "Fatima Zahra", phone: "+212698765432", country: "MA", city: "Rabat" },
    status: { _id: "s1", name: "Delivered", color: "#10b981" }, date: "2026-06-01T14:30:00Z", createdAt: "2026-06-01T14:30:00Z", updatedAt: "2026-06-01T14:30:00Z",
    totalPrice: 299, source: "website",
    details: [{ _id: "d2", name: "Wireless Earbuds", quantity: 2, unitPrice: 149.5, picture: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200", product: { _id: "p2", name: "Wireless Earbuds", code: ["WE-002"], price: 149.5, picture: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200", relatedPictures: [], quantity: { inStock: 120, defective: 0, total: 120 }, details: [{ warehouse: "WH-MA", country: "MA", currency: "MAD", price: 149.5, quantity: { total: 120, inStock: 120, defective: 0, stockAll: 120, expedition: 0 } }] } }],
  },
  {
    _id: "3", id: "ORD-003", customer: { fullName: "Mohamed Amine", phone: "+213555123456", country: "DZ", city: "Algiers" },
    status: { _id: "s2", name: "Shipping", color: "#6366F1" }, date: "2026-06-02T09:15:00Z", createdAt: "2026-06-02T09:15:00Z", updatedAt: "2026-06-02T09:15:00Z",
    totalPrice: 899, source: "facebook",
    details: [{ _id: "d3", name: "Fitness Tracker", quantity: 1, unitPrice: 899, picture: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=200", product: { _id: "p3", name: "Fitness Tracker", code: ["FT-003"], price: 899, picture: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=200", relatedPictures: [], quantity: { inStock: 30, defective: 0, total: 30 }, details: [{ warehouse: "WH-DZ", country: "DZ", currency: "DZD", price: 899, quantity: { total: 30, inStock: 30, defective: 0, stockAll: 30, expedition: 0 } }] } }],
  },
  {
    _id: "4", id: "ORD-004", customer: { fullName: "Aisha Diallo", phone: "+221771234567", country: "SN", city: "Dakar" },
    status: { _id: "s3", name: "Confirmed", color: "#8b5cf6" }, date: "2026-06-02T11:45:00Z", createdAt: "2026-06-02T11:45:00Z", updatedAt: "2026-06-02T11:45:00Z",
    totalPrice: 650, source: "instagram",
    details: [{ _id: "d4", name: "Bluetooth Speaker", quantity: 1, unitPrice: 650, picture: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200", product: { _id: "p4", name: "Bluetooth Speaker", code: ["BS-004"], price: 650, picture: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200", relatedPictures: [], quantity: { inStock: 75, defective: 0, total: 75 }, details: [{ warehouse: "WH-SN", country: "SN", currency: "XOF", price: 650, quantity: { total: 75, inStock: 75, defective: 0, stockAll: 75, expedition: 0 } }] } }],
  },
  {
    _id: "5", id: "ORD-005", customer: { fullName: "Kofi Mensah", phone: "+233241234567", country: "GH", city: "Accra" },
    status: { _id: "s4", name: "Pending", color: "#f59e0b" }, date: "2026-06-02T16:20:00Z", createdAt: "2026-06-02T16:20:00Z", updatedAt: "2026-06-02T16:20:00Z",
    totalPrice: 1200, source: "website",
    details: [{ _id: "d5", name: "Smart Home Hub", quantity: 1, unitPrice: 1200, picture: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=200", product: { _id: "p5", name: "Smart Home Hub", code: ["SHH-005"], price: 1200, picture: "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=200", relatedPictures: [], quantity: { inStock: 15, defective: 0, total: 15 }, details: [{ warehouse: "WH-GH", country: "GH", currency: "GHS", price: 1200, quantity: { total: 15, inStock: 15, defective: 0, stockAll: 15, expedition: 0 } }] } }],
  },
  {
    _id: "6", id: "ORD-006", customer: { fullName: "Yusuf Ibrahim", phone: "+2348012345678", country: "NG", city: "Lagos" },
    status: { _id: "s1", name: "Delivered", color: "#10b981" }, date: "2026-06-03T08:00:00Z", createdAt: "2026-06-03T08:00:00Z", updatedAt: "2026-06-03T08:00:00Z",
    totalPrice: 2500, source: "tiktok",
    details: [{ _id: "d6", name: "Gaming Mouse", quantity: 3, unitPrice: 833.33, picture: "https://images.unsplash.com/photo-1527814050087-37898b6baf30?w=200", product: { _id: "p6", name: "Gaming Mouse", code: ["GM-006"], price: 833.33, picture: "https://images.unsplash.com/photo-1527814050087-37898b6baf30?w=200", relatedPictures: [], quantity: { inStock: 200, defective: 0, total: 200 }, details: [{ warehouse: "WH-NG", country: "NG", currency: "NGN", price: 833.33, quantity: { total: 200, inStock: 200, defective: 0, stockAll: 200, expedition: 0 } }] } }],
  },
  {
    _id: "7", id: "ORD-007", customer: { fullName: "Aminata Traoré", phone: "+22507123456", country: "CI", city: "Abidjan" },
    status: { _id: "s5", name: "Cancelled", color: "#ef4444" }, date: "2026-06-03T10:30:00Z", createdAt: "2026-06-03T10:30:00Z", updatedAt: "2026-06-03T10:30:00Z",
    totalPrice: 350, source: "facebook",
    details: [{ _id: "d7", name: "Phone Case", quantity: 5, unitPrice: 70, picture: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200", product: { _id: "p7", name: "Phone Case", code: ["PC-007"], price: 70, picture: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200", relatedPictures: [], quantity: { inStock: 500, defective: 0, total: 500 }, details: [{ warehouse: "WH-CI", country: "CI", currency: "XOF", price: 70, quantity: { total: 500, inStock: 500, defective: 0, stockAll: 500, expedition: 0 } }] } }],
  },
  {
    _id: "8", id: "ORD-008", customer: { fullName: "Hassan El Fassi", phone: "+212655443322", country: "MA", city: "Marrakech" },
    status: { _id: "s1", name: "Delivered", color: "#10b981" }, date: "2026-06-03T13:15:00Z", createdAt: "2026-06-03T13:15:00Z", updatedAt: "2026-06-03T13:15:00Z",
    totalPrice: 780, source: "website",
    details: [{ _id: "d8", name: "Power Bank 20000mAh", quantity: 2, unitPrice: 390, picture: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200", product: { _id: "p8", name: "Power Bank 20000mAh", code: ["PB-008"], price: 390, picture: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200", relatedPictures: [], quantity: { inStock: 88, defective: 0, total: 88 }, details: [{ warehouse: "WH-MA", country: "MA", currency: "MAD", price: 390, quantity: { total: 88, inStock: 88, defective: 0, stockAll: 88, expedition: 0 } }] } }],
  },
  {
    _id: "9", id: "ORD-009", customer: { fullName: "Grace Okafor", phone: "+2347098765432", country: "NG", city: "Abuja" },
    status: { _id: "s2", name: "Shipping", color: "#6366F1" }, date: "2026-06-03T15:45:00Z", createdAt: "2026-06-03T15:45:00Z", updatedAt: "2026-06-03T15:45:00Z",
    totalPrice: 1850, source: "instagram",
    details: [{ _id: "d9", name: "Wireless Charger", quantity: 1, unitPrice: 1850, picture: "https://images.unsplash.com/photo-1586953208270-767889fa9b0f?w=200", product: { _id: "p9", name: "Wireless Charger", code: ["WC-009"], price: 1850, picture: "https://images.unsplash.com/photo-1586953208270-767889fa9b0f?w=200", relatedPictures: [], quantity: { inStock: 42, defective: 0, total: 42 }, details: [{ warehouse: "WH-NG", country: "NG", currency: "NGN", price: 1850, quantity: { total: 42, inStock: 42, defective: 0, stockAll: 42, expedition: 0 } }] } }],
  },
  {
    _id: "10", id: "ORD-010", customer: { fullName: "Omar Sow", phone: "+221789876543", country: "SN", city: "Thiès" },
    status: { _id: "s4", name: "Pending", color: "#f59e0b" }, date: "2026-06-03T17:00:00Z", createdAt: "2026-06-03T17:00:00Z", updatedAt: "2026-06-03T17:00:00Z",
    totalPrice: 420, source: "facebook",
    details: [{ _id: "d10", name: "LED Desk Lamp", quantity: 2, unitPrice: 210, picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", product: { _id: "p10", name: "LED Desk Lamp", code: ["LDL-010"], price: 210, picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", relatedPictures: [], quantity: { inStock: 65, defective: 0, total: 65 }, details: [{ warehouse: "WH-SN", country: "SN", currency: "XOF", price: 210, quantity: { total: 65, inStock: 65, defective: 0, stockAll: 65, expedition: 0 } }] } }],
  },
  {
    _id: "11", id: "ORD-011", customer: { fullName: "Kwame Asante", phone: "+233201234567", country: "GH", city: "Kumasi" },
    status: { _id: "s3", name: "Confirmed", color: "#8b5cf6" }, date: "2026-05-31T09:30:00Z", createdAt: "2026-05-31T09:30:00Z", updatedAt: "2026-05-31T09:30:00Z",
    totalPrice: 950, source: "website",
    details: [{ _id: "d11", name: "Mechanical Keyboard", quantity: 1, unitPrice: 950, picture: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200", product: { _id: "p11", name: "Mechanical Keyboard", code: ["MK-011"], price: 950, picture: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200", relatedPictures: [], quantity: { inStock: 28, defective: 0, total: 28 }, details: [{ warehouse: "WH-GH", country: "GH", currency: "GHS", price: 950, quantity: { total: 28, inStock: 28, defective: 0, stockAll: 28, expedition: 0 } }] } }],
  },
  {
    _id: "12", id: "ORD-012", customer: { fullName: "Leila Benjelloun", phone: "+212677889900", country: "MA", city: "Fes" },
    status: { _id: "s6", name: "Out of Stock", color: "#64748B" }, date: "2026-05-30T14:00:00Z", createdAt: "2026-05-30T14:00:00Z", updatedAt: "2026-05-30T14:00:00Z",
    totalPrice: 1500, source: "tiktok",
    details: [{ _id: "d12", name: "Drone Mini", quantity: 1, unitPrice: 1500, picture: "https://images.unsplash.com/photo-1507502284763-83e33ef8b1d5?w=200", product: { _id: "p12", name: "Drone Mini", code: ["DM-012"], price: 1500, picture: "https://images.unsplash.com/photo-1507502284763-83e33ef8b1d5?w=200", relatedPictures: [], quantity: { inStock: 0, defective: 0, total: 0 }, details: [{ warehouse: "WH-MA", country: "MA", currency: "MAD", price: 1500, quantity: { total: 0, inStock: 0, defective: 0, stockAll: 0, expedition: 0 } }] } }],
  },
  {
    _id: "13", id: "ORD-013", customer: { fullName: "Ibrahim Keita", phone: "+22320123456", country: "ML", city: "Bamako" },
    status: { _id: "s1", name: "Delivered", color: "#10b981" }, date: "2026-05-29T11:20:00Z", createdAt: "2026-05-29T11:20:00Z", updatedAt: "2026-05-29T11:20:00Z",
    totalPrice: 550, source: "website",
    details: [{ _id: "d13", name: "USB-C Hub", quantity: 2, unitPrice: 275, picture: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200", product: { _id: "p13", name: "USB-C Hub", code: ["UC-013"], price: 275, picture: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=200", relatedPictures: [], quantity: { inStock: 150, defective: 0, total: 150 }, details: [{ warehouse: "WH-ML", country: "ML", currency: "XOF", price: 275, quantity: { total: 150, inStock: 150, defective: 0, stockAll: 150, expedition: 0 } }] } }],
  },
  {
    _id: "14", id: "ORD-014", customer: { fullName: "Amina Hassan", phone: "+2348123456789", country: "NG", city: "Kano" },
    status: { _id: "s7", name: "Double", color: "#ec4899" }, date: "2026-05-28T16:45:00Z", createdAt: "2026-05-28T16:45:00Z", updatedAt: "2026-05-28T16:45:00Z",
    totalPrice: 680, source: "facebook",
    details: [{ _id: "d14", name: "Smart Bulb Set", quantity: 4, unitPrice: 170, picture: "https://images.unsplash.com/photo-1550985543-49bee3167284?w=200", product: { _id: "p14", name: "Smart Bulb Set", code: ["SB-014"], price: 170, picture: "https://images.unsplash.com/photo-1550985543-49bee3167284?w=200", relatedPictures: [], quantity: { inStock: 95, defective: 0, total: 95 }, details: [{ warehouse: "WH-NG", country: "NG", currency: "NGN", price: 170, quantity: { total: 95, inStock: 95, defective: 0, stockAll: 95, expedition: 0 } }] } }],
  },
  {
    _id: "15", id: "ORD-015", customer: { fullName: "Moussa Camara", phone: "+224621234567", country: "GN", city: "Conakry" },
    status: { _id: "s8", name: "Transferred", color: "#8b5cf6" }, date: "2026-05-27T10:10:00Z", createdAt: "2026-05-27T10:10:00Z", updatedAt: "2026-05-27T10:10:00Z",
    totalPrice: 890, source: "instagram",
    details: [{ _id: "d15", name: "Portable Projector", quantity: 1, unitPrice: 890, picture: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200", product: { _id: "p15", name: "Portable Projector", code: ["PP-015"], price: 890, picture: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=200", relatedPictures: [], quantity: { inStock: 12, defective: 0, total: 12 }, details: [{ warehouse: "WH-GN", country: "GN", currency: "GNF", price: 890, quantity: { total: 12, inStock: 12, defective: 0, stockAll: 12, expedition: 0 } }] } }],
  },
];

const MOCK_WAREHOUSES: CodinAfricaWarehouse[] = [
  { _id: "wh1", name: "Morocco Warehouse", country: "MA", countryName: "Morocco", flag: "https://flagcdn.com/ma.png", currency: "MAD", is_primary: true },
  { _id: "wh2", name: "Algeria Warehouse", country: "DZ", countryName: "Algeria", flag: "https://flagcdn.com/dz.png", currency: "DZD", is_primary: false },
  { _id: "wh3", name: "Senegal Warehouse", country: "SN", countryName: "Senegal", flag: "https://flagcdn.com/sn.png", currency: "XOF", is_primary: false },
  { _id: "wh4", name: "Ghana Warehouse", country: "GH", countryName: "Ghana", flag: "https://flagcdn.com/gh.png", currency: "GHS", is_primary: false },
  { _id: "wh5", name: "Nigeria Warehouse", country: "NG", countryName: "Nigeria", flag: "https://flagcdn.com/ng.png", currency: "NGN", is_primary: true },
  { _id: "wh6", name: "Ivory Coast Warehouse", country: "CI", countryName: "Ivory Coast", flag: "https://flagcdn.com/ci.png", currency: "XOF", is_primary: false },
  { _id: "wh7", name: "Mali Warehouse", country: "ML", countryName: "Mali", flag: "https://flagcdn.com/ml.png", currency: "XOF", is_primary: false },
  { _id: "wh8", name: "Guinea Warehouse", country: "GN", countryName: "Guinea", flag: "https://flagcdn.com/gn.png", currency: "GNF", is_primary: false },
];

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
    apiUrl: (stored?.apiUrl || process.env.NEXT_PUBLIC_CODINAFRICA_API_URL || DEFAULT_API_URL).trim(),
    token: (stored?.token || process.env.NEXT_PUBLIC_CODINAFRICA_TOKEN || "").trim(),
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
  const rawStatusName = raw.status?.name || "unknown";
  const mappedStatus = STATUS_MAP[rawStatusName] || rawStatusName.toLowerCase();
  
  return {
    id: raw._id,
    orderId: raw.id,
    customerName: raw.customer?.fullName || "Unknown",
    phone: raw.customer?.phone || "",
    country: raw.customer?.country || "",
    countryName: COUNTRY_NAMES[raw.customer?.country] || raw.customer?.country || "",
    status: mappedStatus,
    rawStatus: rawStatusName,
    statusColor: raw.status?.color || "#94A3B8",
    date: raw.createdAt || raw.date || raw.updatedAt,
    amount: Math.round(raw.totalPrice || 0),
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
      revenue: Math.round(d.unitPrice * d.quantity) || 0,
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
  private shippingsCache: CodinAfricaShipping[] = [];
  private warehousesCache: CodinAfricaWarehouse[] = [];
  private allDataCache: {
    data: { orders: Order[]; products: Product[]; shippings: CodinAfricaShipping[]; countries: CountryStats[]; stats: DashboardStats; revenueTrend: RevenuePoint[] } | null;
    ts: number;
  } = { data: null, ts: 0 };
  private pendingFetchOrders: Promise<CodinAfricaOrder[]> | null = null;
  private pendingFetchShippings: Promise<CodinAfricaShipping[]> | null = null;
  private pendingFetchAllData: Promise<{
    orders: Order[]; products: Product[]; shippings: CodinAfricaShipping[]; countries: CountryStats[]; stats: DashboardStats; revenueTrend: RevenuePoint[];
  }> | null = null;
  private readonly CACHE_TTL = 45000;

  constructor() {
    const config = getApiConfig();
    this.token = config.token;
    this.apiUrl = config.apiUrl;
  }

  refreshConfig(): void {
    const config = getApiConfig();
    if (config.token === this.token && config.apiUrl === this.apiUrl) return;
    this.token = config.token;
    this.apiUrl = config.apiUrl;
    this.clearCache();
  }

  clearCache(): void {
    this.ordersCache = [];
    this.shippingsCache = [];
    this.warehousesCache = [];
    this.allDataCache = { data: null, ts: 0 };
    this.pendingFetchOrders = null;
    this.pendingFetchShippings = null;
    this.pendingFetchAllData = null;
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
    if (!this.token) {
      this.ordersCache = MOCK_ORDERS;
      return MOCK_ORDERS;
    }
    if (this.ordersCache.length > 0) return this.ordersCache;
    if (this.pendingFetchOrders) return this.pendingFetchOrders;

    const doFetch = async () => {
      const perPage = 1000;
      const first = await this.request<ApiResponse<CodinAfricaOrder>>(`/orders/search?limit=${perPage}&page=1`);
      const firstResults = first?.content?.results || [];
      const lastPage = first?.content?.last_page || 1;
      const total = first?.content?.total || firstResults.length;
      console.log(`[API] Orders: ${total} total, ${lastPage} pages, fetching...`);

      if (lastPage <= 1) {
        this.ordersCache = firstResults;
        return firstResults;
      }

    const pagesToFetch = Math.min(lastPage, 35);
    const pagePromises: Promise<ApiResponse<CodinAfricaOrder>>[] = [];
    for (let p = 2; p <= pagesToFetch; p++) {
      pagePromises.push(this.request<ApiResponse<CodinAfricaOrder>>(`/orders/search?limit=${perPage}&page=${p}`));
    }
    const settled = await Promise.allSettled(pagePromises);
    const restResults: CodinAfricaOrder[] = [];
    let failedPages = 0;
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === "fulfilled") {
        const items = r.value?.content?.results || [];
        restResults.push(...items);
      } else {
        failedPages++;
        console.warn(`[API] Page ${i + 2} failed: ${r.reason}`);
      }
    }
    const allOrders = [firstResults, ...restResults].flat();
    console.log(`[API] Fetched ${allOrders.length} orders total${failedPages > 0 ? ` (${failedPages} pages failed)` : ""}`);
    this.ordersCache = allOrders;
    return allOrders;
    };

    this.pendingFetchOrders = doFetch();
    try {
      return await this.pendingFetchOrders;
    } finally {
      this.pendingFetchOrders = null;
    }
  }

  async fetchAllShippings(): Promise<CodinAfricaShipping[]> {
    if (!this.token) return [];
    if (this.shippingsCache.length > 0) return this.shippingsCache;
    if (this.pendingFetchShippings) return this.pendingFetchShippings;

    const doFetch = async () => {
      const perPage = 1000;
      const first = await this.request<ApiResponse<CodinAfricaShipping>>(`/shippings/search?limit=${perPage}&page=1`);
      const firstResults = first?.content?.results || [];
      const lastPage = first?.content?.last_page || 1;
      const total = first?.content?.total || firstResults.length;
      console.log(`[API] Shippings: ${total} total, ${lastPage} pages, fetching...`);

      if (lastPage <= 1) {
        this.shippingsCache = firstResults;
        return firstResults;
      }

      const pagesToFetch = Math.min(lastPage, 35);
      const pagePromises: Promise<ApiResponse<CodinAfricaShipping>>[] = [];
      for (let p = 2; p <= pagesToFetch; p++) {
        pagePromises.push(this.request<ApiResponse<CodinAfricaShipping>>(`/shippings/search?limit=${perPage}&page=${p}`));
      }
      const settled = await Promise.allSettled(pagePromises);
      const restResults: CodinAfricaShipping[] = [];
      let failedPages = 0;
      for (let i = 0; i < settled.length; i++) {
        const r = settled[i];
        if (r.status === "fulfilled") {
          const items = r.value?.content?.results || [];
          restResults.push(...items);
        } else {
          failedPages++;
          console.warn(`[API] Shippings page ${i + 2} failed: ${r.reason}`);
        }
      }
      const allShippings = [firstResults, ...restResults].flat();
      console.log(`[API] Fetched ${allShippings.length} shippings total${failedPages > 0 ? ` (${failedPages} pages failed)` : ""}`);
      this.shippingsCache = allShippings;
      return allShippings;
    };

    this.pendingFetchShippings = doFetch();
    try {
      return await this.pendingFetchShippings;
    } finally {
      this.pendingFetchShippings = null;
    }
  }

  async fetchWarehouses(): Promise<CodinAfricaWarehouse[]> {
    if (!this.token) {
      this.warehousesCache = MOCK_WAREHOUSES;
      return MOCK_WAREHOUSES;
    }
    if (this.warehousesCache.length > 0) return this.warehousesCache;
    const data = await this.request<ApiResponse<CodinAfricaWarehouse>>("/warehouses/search?limit=50");
    const warehouses = data?.content?.results || [];
    this.warehousesCache = warehouses;
    return warehouses;
  }

  async fetchAllData(): Promise<{
    orders: Order[];
    products: Product[];
    shippings: CodinAfricaShipping[];
    countries: CountryStats[];
    stats: DashboardStats;
    revenueTrend: RevenuePoint[];
  }> {
    const now = Date.now();
    if (this.allDataCache.data && now - this.allDataCache.ts < this.CACHE_TTL) {
      return this.allDataCache.data;
    }
    if (this.pendingFetchAllData) return this.pendingFetchAllData;

    const doFetch = async () => {
      const [rawOrders, warehouses, rawShippings] = await Promise.all([
        this.fetchAllOrders(),
        this.fetchWarehouses(),
        this.fetchAllShippings(),
      ]);

      const mappedOrders = rawOrders.map(mapOrder);
      const allProducts = rawOrders.flatMap(mapProduct);
      const stats = this.computeStats(mappedOrders, allProducts, rawShippings);
      const countries = this.computeCountries(mappedOrders, warehouses);
      const revenueTrend = this.computeRevenueTrend(mappedOrders);

      const result = { orders: mappedOrders, products: allProducts, shippings: rawShippings, countries, stats, revenueTrend };
      this.allDataCache = { data: result, ts: Date.now() };
      return result;
    };

    this.pendingFetchAllData = doFetch();
    try {
      return await this.pendingFetchAllData;
    } finally {
      this.pendingFetchAllData = null;
    }
  }

  private computeStats(orders: Order[], products: Product[], shippings: CodinAfricaShipping[]): DashboardStats {
    const total = orders.length;
    const revenue = orders.reduce((s, o) => s + o.amount, 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const outOfStock = orders.filter((o) => o.status === "out_of_stock").length;
    const double = orders.filter((o) => o.status === "double").length;
    const transferred = orders.filter((o) => o.status === "transferred").length;
    const unreached = orders.filter((o) => o.status === "unreached").length;
    const processedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "processed").length;
    const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "processed" || o.status === "delivered" || o.status === "shipping" || o.status === "shipped").length;
    const nonCancelled = total - cancelled - outOfStock - double - transferred - unreached;
    const uniqueProducts = new Set(products.map((p) => p.id)).size;
    const processedRevenue = orders
      .filter((o) => o.status === "confirmed" || o.status === "processed")
      .reduce((s, o) => s + o.amount, 0);
    const confirmedRevenue = orders
      .filter((o) => o.status === "confirmed" || o.status === "processed" || o.status === "delivered" || o.status === "shipping" || o.status === "shipped")
      .reduce((s, o) => s + o.amount, 0);

    const deliveredOrders = shippings.filter((s) => s.status === "delivered").length;
    const paidOrders = shippings.filter((s) => s.status === "processed").length;
    const shippedOrders = shippings.filter((s) => s.status === "shipped").length;
    const returnedOrders = shippings.filter((s) => s.status === "return").length;
    const toPrepareOrders = shippings.filter((s) => s.status === "to prepare").length;
    const preparedOrders = shippings.filter((s) => s.status === "prepared").length;
    const reprogrammerOrders = shippings.filter((s) => s.status === "reprogrammer").length;
    const deliveredRevenue = shippings
      .filter((s) => s.status === "delivered")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const paidRevenue = shippings
      .filter((s) => s.status === "processed")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const totalDeliveryAttempts = paidOrders + returnedOrders;
    const deliveryRate = totalDeliveryAttempts > 0 ? paidOrders / totalDeliveryAttempts : 0;

    let serviceFeesTotal = 0;
    const processedByCountry = new Map<string, number>();
    for (const o of orders) {
      if (o.status === "confirmed" || o.status === "processed") {
        const c = o.country || "XX";
        processedByCountry.set(c, (processedByCountry.get(c) || 0) + 1);
      }
    }
    for (const [country, count] of processedByCountry) {
      const feePerOrder = getFeeForCountry(country);
      serviceFeesTotal += computeServiceFees(count, feePerOrder);
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
      unreachedOrders: unreached,
      confirmedOrders: confirmedOrders,
      deliveredOrders,
      paidOrders,
      shippedOrders,
      returnedOrders,
      toPrepareOrders,
      preparedOrders,
      reprogrammerOrders,
      processedOrders,
      processedRevenue,
      confirmedRevenue,
      deliveredRevenue,
      paidRevenue,
      netRevenue,
      serviceFeesTotal,
      confirmationRate: nonCancelled > 0 ? confirmedOrders / nonCancelled : 0,
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
      else if (o.status === "confirmed" || o.status === "delivered" || o.status === "shipping" || o.status === "shipped") entry.confirmed += 1;
      if (o.status === "confirmed") {
        entry.processedOrders += 1;
        entry.processedRevenue += o.amount;
      }
    }

    const warehouseMap = new Map(warehouses.map((w) => [w.country, w]));

    return Array.from(map.entries()).map(([code, data]) => {
      const w = warehouseMap.get(code);
      const totalNonCancelled = data.orders - data.cancelled - data.outOfStock;
      const feePerOrder = getFeeForCountry(code);
      const serviceFees = computeServiceFees(data.processedOrders, feePerOrder);
      const netRevenue = data.processedRevenue - serviceFees;
      return {
        country: code,
        countryName: w?.countryName || COUNTRY_NAMES[code] || code,
        flag: w?.flag || COUNTRY_FLAGS[code] || "",
        currency: w?.currency || COUNTRY_CURRENCIES[code] || "USD",
        ...data,
        grossRevenue: data.processedRevenue,
        feePerOrder,
        serviceFees,
        netRevenue,
        confirmationRate: totalNonCancelled > 0 ? data.confirmed / totalNonCancelled : 0,
        deliveryRate: data.orders > 0 ? data.processedOrders / data.orders : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  private computeRevenueTrend(orders: Order[]): RevenuePoint[] {
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const day = toParisDate(o.date);
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
