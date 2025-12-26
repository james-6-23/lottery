import { apiClient } from './client';

export type ProductStatus = 'available' | 'sold_out' | 'offline';

export interface Product {
  id: number;
  name: string;
  description: string;
  image: string;
  price: number;
  stock: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ProductQuery {
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export interface RedeemRequest {
  product_id: number;
}

export interface RedeemResponse {
  card_key: string;
  product_name: string;
  cost: number;
  balance: number;
  record_id: number;
}

export interface ExchangeRecord {
  id: number;
  product_id: number;
  product_name: string;
  card_key: string;
  cost: number;
  created_at: string;
}

export interface ExchangeRecordListResponse {
  records: ExchangeRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ExchangeRecordQuery {
  page?: number;
  limit?: number;
}

// Get product list
export async function getProducts(query?: ProductQuery): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/exchange/products?${queryString}` : '/exchange/products';
  return apiClient.get<ProductListResponse>(endpoint);
}

// Get product by ID
export async function getProductById(id: number): Promise<Product> {
  return apiClient.get<Product>(`/exchange/products/${id}`);
}

// Redeem a product
export async function redeemProduct(productId: number): Promise<RedeemResponse> {
  return apiClient.post<RedeemResponse>('/exchange/redeem', { product_id: productId });
}

// Get exchange records
export async function getExchangeRecords(query?: ExchangeRecordQuery): Promise<ExchangeRecordListResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/exchange/records?${queryString}` : '/exchange/records';
  return apiClient.get<ExchangeRecordListResponse>(endpoint);
}

// Get exchange record by ID
export async function getExchangeRecordById(id: number): Promise<ExchangeRecord> {
  return apiClient.get<ExchangeRecord>(`/exchange/records/${id}`);
}

// Helper function to get product status label
export function getProductStatusLabel(status: ProductStatus): string {
  const labels: Record<ProductStatus, string> = {
    available: '可兑换',
    sold_out: '已兑完',
    offline: '已下架',
  };
  return labels[status] || status;
}

// Helper function to get product status color
export function getProductStatusColor(status: ProductStatus): string {
  const colors: Record<ProductStatus, string> = {
    available: 'text-green-500',
    sold_out: 'text-red-500',
    offline: 'text-gray-500',
  };
  return colors[status] || 'text-gray-500';
}
