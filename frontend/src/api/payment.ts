import { apiClient } from './client';

export interface RechargeRequest {
  amount: number; // Amount in yuan
}

export interface RechargeResponse {
  order_no: string;
  payment_url: string;
  amount: number;
  points: number;
}

export interface PaymentOrder {
  id: number;
  order_no: string;
  amount: number; // Amount in yuan
  points: number;
  status: 'pending' | 'paid' | 'failed';
  payment_type?: string;
  trade_no?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrderListResponse {
  orders: PaymentOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentStatus {
  payment_enabled: boolean;
}

// Get payment status (whether payment is enabled)
export async function getPaymentStatus(): Promise<PaymentStatus> {
  return apiClient.get<PaymentStatus>('/system/payment-status');
}

// Create a recharge order
export async function createRechargeOrder(amount: number): Promise<RechargeResponse> {
  return apiClient.post<RechargeResponse>('/payment/recharge', { amount });
}

// Get order status by order number
export async function getOrderStatus(orderNo: string): Promise<PaymentOrder> {
  return apiClient.get<PaymentOrder>(`/payment/orders/${orderNo}`);
}

// Get user's payment orders
export async function getPaymentOrders(page?: number, limit?: number): Promise<PaymentOrderListResponse> {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/payment/orders?${queryString}` : '/payment/orders';
  return apiClient.get<PaymentOrderListResponse>(endpoint);
}

// Helper function to get order status label
export function getOrderStatusLabel(status: PaymentOrder['status']): string {
  const labels: Record<PaymentOrder['status'], string> = {
    pending: '待支付',
    paid: '已支付',
    failed: '支付失败',
  };
  return labels[status] || status;
}

// Helper function to get order status color
export function getOrderStatusColor(status: PaymentOrder['status']): string {
  const colors: Record<PaymentOrder['status'], string> = {
    pending: 'text-yellow-500',
    paid: 'text-green-500',
    failed: 'text-red-500',
  };
  return colors[status] || 'text-gray-500';
}

// Predefined recharge amounts
export const RECHARGE_AMOUNTS = [
  { amount: 10, points: 100, label: '10元' },
  { amount: 30, points: 300, label: '30元' },
  { amount: 50, points: 500, label: '50元' },
  { amount: 100, points: 1000, label: '100元' },
  { amount: 200, points: 2000, label: '200元' },
  { amount: 500, points: 5000, label: '500元' },
];
