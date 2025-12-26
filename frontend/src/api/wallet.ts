import { apiClient } from './client';

export type TransactionType = 'initial' | 'recharge' | 'purchase' | 'win' | 'exchange';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id?: number;
  created_at: string;
}

export interface WalletResponse {
  id: number;
  user_id: number;
  balance: number;
  transactions?: Transaction[];
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TransactionQuery {
  type?: TransactionType;
  page?: number;
  limit?: number;
}

// Get wallet information
export async function getWallet(): Promise<WalletResponse> {
  return apiClient.get<WalletResponse>('/wallet');
}

// Get wallet balance only
export async function getBalance(): Promise<{ balance: number }> {
  return apiClient.get<{ balance: number }>('/wallet/balance');
}

// Get transaction history with pagination and filtering
export async function getTransactions(query?: TransactionQuery): Promise<TransactionListResponse> {
  const params = new URLSearchParams();
  if (query?.type) params.append('type', query.type);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/wallet/transactions?${queryString}` : '/wallet/transactions';
  return apiClient.get<TransactionListResponse>(endpoint);
}

// Check if user has sufficient balance
export async function checkBalance(amount: number): Promise<{ sufficient: boolean }> {
  return apiClient.post<{ sufficient: boolean }>('/wallet/check-balance', { amount });
}

// Helper function to get transaction type label
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    initial: '注册赠送',
    recharge: '充值',
    purchase: '购买彩票',
    win: '中奖',
    exchange: '兑换商品',
  };
  return labels[type] || type;
}

// Helper function to get transaction type color
export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    initial: 'text-blue-500',
    recharge: 'text-green-500',
    purchase: 'text-orange-500',
    win: 'text-yellow-500',
    exchange: 'text-purple-500',
  };
  return colors[type] || 'text-gray-500';
}
