import { apiClient } from './client';
import type { TicketStatus } from './lottery';

// User profile types
export interface UserProfile {
  id: number;
  linuxdo_id: string;
  username: string;
  avatar: string;
  role: string;
  balance: number;
  created_at: string;
}

// User statistics types
export interface UserStatistics {
  total_purchases: number;
  total_spent: number;
  total_wins: number;
  total_win_amount: number;
  max_single_win: number;
  total_exchanges: number;
  total_exchange_spent: number;
  win_rate: number;
}

// Ticket record types
export interface TicketRecord {
  id: number;
  lottery_type_id: number;
  lottery_name: string;
  security_code: string;
  price: number;
  prize_amount?: number;
  status: TicketStatus;
  purchased_at: string;
  scratched_at?: string;
}

export interface TicketRecordListResponse {
  tickets: TicketRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface TicketRecordQuery {
  lottery_type_id?: number;
  status?: TicketStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// Win record types
export interface WinRecord {
  id: number;
  lottery_type_id: number;
  lottery_name: string;
  security_code: string;
  prize_amount: number;
  scratched_at: string;
}

export interface WinRecordListResponse {
  wins: WinRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Get user profile
export async function getUserProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/user/profile');
}

// Get user statistics
export async function getUserStatistics(): Promise<UserStatistics> {
  return apiClient.get<UserStatistics>('/user/statistics');
}

// Get user ticket records
export async function getUserTickets(query?: TicketRecordQuery): Promise<TicketRecordListResponse> {
  const params = new URLSearchParams();
  if (query?.lottery_type_id) params.append('lottery_type_id', query.lottery_type_id.toString());
  if (query?.status) params.append('status', query.status);
  if (query?.start_date) params.append('start_date', query.start_date);
  if (query?.end_date) params.append('end_date', query.end_date);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/user/tickets?${queryString}` : '/user/tickets';
  return apiClient.get<TicketRecordListResponse>(endpoint);
}

// Get user win records
export async function getUserWins(page = 1, limit = 20): Promise<WinRecordListResponse> {
  return apiClient.get<WinRecordListResponse>(`/user/wins?page=${page}&limit=${limit}`);
}

// Helper function to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Helper function to format short date
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}
