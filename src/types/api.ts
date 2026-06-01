export interface CodinAfricaOrder {
  _id: string;
  id: string;
  details: CodinAfricaOrderDetail[];
  customer: CodinAfricaCustomer;
  totalPrice: number;
  status: CodinAfricaStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  isExpress?: boolean;
}

export interface CodinAfricaOrderDetail {
  _id: string;
  quantity: number;
  unitPrice: number;
  product: CodinAfricaProduct;
  name: string;
  picture?: string;
  warehouseParent?: string;
}

export interface CodinAfricaProduct {
  _id: string;
  name: string;
  code: string[];
  quantity: { inStock: number; defective: number; total: number };
  price: number;
  details: CodinAfricaProductDetail[];
  picture?: string;
  type?: string;
  typeAFF?: string;
  visibility?: string;
  outOfStock?: boolean;
  id_v2?: string;
  id?: string;
  createdAt?: string;
}

export interface CodinAfricaProductDetail {
  quantity: { total: number; inStock: number; defective: number; stockAll: number; expedition: number };
  price: number;
  commission?: number;
  warehouse: string;
  country: string;
  currency: string;
  outOfStock?: boolean;
  discountPrice?: { price: number | null };
}

export interface CodinAfricaCustomer {
  fullName: string;
  city: string;
  phone: string;
  address?: string;
  shippingAddress?: string;
  country: string;
  phoneNormalized?: string;
}

export interface CodinAfricaStatus {
  _id: string;
  name: string;
  color: string;
  fees?: number;
}

export interface CodinAfricaWarehouse {
  _id: string;
  name: string;
  country: string;
  countryName: string;
  currency: string;
  flag: string;
  is_primary: boolean;
}

export interface ApiResponse<T> {
  content: { results: T[] };
  status: number;
}

export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  country: string;
  countryName: string;
  status: string;
  statusColor: string;
  date: string;
  amount: number;
  productName: string;
  productCode: string;
  quantity: number;
  city: string;
  source?: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  totalSold: number;
  revenue: number;
  stockQuantity: number;
  warehouse: string;
  country: string;
  countryName: string;
  currency: string;
  image?: string;
  price: number;
}

export interface CountryStats {
  country: string;
  countryName: string;
  flag: string;
  currency: string;
  revenue: number;
  orders: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  outOfStock: number;
  confirmationRate: number;
  deliveryRate: number;
}

export interface DashboardStats {
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  outOfStockOrders: number;
  doubleOrders: number;
  transferredOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  confirmationRate: number;
  deliveryRate: number;
  totalProducts: number;
  averageOrderValue: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  product: Product;
  totalRevenue: number;
  totalSold: number;
  orderCount: number;
  revenueShare: number;
}

export interface AuthCredentials {
  apiUrl: string;
  token: string;
}
