import { apiClient } from './client';

export type GameType = 'number_match' | 'symbol_match' | 'amount_sum' | 'multiplier' | 'pattern';
export type LotteryTypeStatus = 'available' | 'sold_out' | 'disabled';

export interface LotteryType {
  id: number;
  name: string;
  description: string;
  price: number;
  max_prize: number;
  game_type: GameType;
  cover_image: string;
  status: LotteryTypeStatus;
  stock: number;
  prize_levels?: PrizeLevel[];
  created_at: string;
  updated_at: string;
}

export interface PrizeLevel {
  id: number;
  level: number;
  name: string;
  prize_amount: number;
  quantity: number;
  remaining: number;
}

export interface LotteryTypeDetail extends LotteryType {
  rules: string;
  rules_config?: Record<string, unknown>;
  prize_levels: PrizeLevel[];
  win_symbols?: string[];
}

export interface LotteryTypeListResponse {
  lottery_types: LotteryType[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface LotteryTypeQuery {
  status?: LotteryTypeStatus;
  game_type?: GameType;
  page?: number;
  limit?: number;
}

// Get all lottery types with pagination and filtering
export async function getLotteryTypes(query?: LotteryTypeQuery): Promise<LotteryTypeListResponse> {
  const params = new URLSearchParams();
  if (query?.status) params.append('status', query.status);
  if (query?.game_type) params.append('game_type', query.game_type);
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  
  const queryString = params.toString();
  const endpoint = queryString ? `/lottery/types?${queryString}` : '/lottery/types';
  return apiClient.get<LotteryTypeListResponse>(endpoint);
}

// Get lottery type by ID with details
export async function getLotteryTypeById(id: number): Promise<LotteryTypeDetail> {
  return apiClient.get<LotteryTypeDetail>(`/lottery/types/${id}`);
}

// Get prize levels for a lottery type
export async function getPrizeLevels(lotteryTypeId: number): Promise<PrizeLevel[]> {
  return apiClient.get<PrizeLevel[]>(`/lottery/types/${lotteryTypeId}/prize-levels`);
}

// Helper function to get game type label
export function getGameTypeLabel(type: GameType): string {
  const labels: Record<GameType, string> = {
    number_match: '数字匹配',
    symbol_match: '符号匹配',
    amount_sum: '金额累加',
    multiplier: '翻倍型',
    pattern: '图案型',
  };
  return labels[type] || type;
}

// Helper function to get status label
export function getStatusLabel(status: LotteryTypeStatus): string {
  const labels: Record<LotteryTypeStatus, string> = {
    available: '可购买',
    sold_out: '已售罄',
    disabled: '已下架',
  };
  return labels[status] || status;
}

// Helper function to get status color
export function getStatusColor(status: LotteryTypeStatus): string {
  const colors: Record<LotteryTypeStatus, string> = {
    available: 'text-green-500 bg-green-50',
    sold_out: 'text-orange-500 bg-orange-50',
    disabled: 'text-gray-500 bg-gray-50',
  };
  return colors[status] || 'text-gray-500 bg-gray-50';
}

// Helper function to format price
export function formatPrice(price: number): string {
  return `${price} 积分`;
}

// Helper function to format prize amount
export function formatPrize(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万`;
  }
  return amount.toString();
}


// Ticket types
export type TicketStatus = 'unscratched' | 'scratched' | 'claimed';

export interface Ticket {
  id: number;
  user_id: number;
  lottery_type_id: number;
  security_code: string;
  prize_amount?: number;
  status: TicketStatus;
  purchased_at: string;
  scratched_at?: string;
  lottery_type?: LotteryType;
}

export interface PurchaseRequest {
  lottery_type_id: number;
  quantity: number;
}

export interface PurchaseResponse {
  tickets: Ticket[];
  cost: number;
  balance: number;
}

export interface PurchasePreview {
  lottery_type: LotteryTypeDetail;
  quantity: number;
  unit_price: number;
  total_cost: number;
  current_balance: number;
  balance_after: number;
  can_purchase: boolean;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface VerifyResponse {
  security_code: string;
  lottery_type: string;
  purchase_time: string;
  status: TicketStatus;
  prize_amount?: number;
  scratched_at?: string;
}

// Purchase tickets
export async function purchaseTickets(request: PurchaseRequest): Promise<PurchaseResponse> {
  return apiClient.post<PurchaseResponse>('/lottery/purchase', request);
}

// Get purchase preview
export async function getPurchasePreview(request: PurchaseRequest): Promise<PurchasePreview> {
  return apiClient.post<PurchasePreview>('/lottery/purchase/preview', request);
}

// Get user's tickets
export async function getUserTickets(page = 1, limit = 20): Promise<TicketListResponse> {
  return apiClient.get<TicketListResponse>(`/lottery/tickets?page=${page}&limit=${limit}`);
}

// Get ticket by ID
export async function getTicketById(id: number): Promise<Ticket> {
  return apiClient.get<Ticket>(`/lottery/tickets/${id}`);
}

// Verify security code
export async function verifySecurityCode(code: string): Promise<VerifyResponse> {
  return apiClient.get<VerifyResponse>(`/lottery/verify/${code}`);
}

// Helper function to get ticket status label
export function getTicketStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    unscratched: '未刮开',
    scratched: '已刮开',
    claimed: '已兑奖',
  };
  return labels[status] || status;
}

// Helper function to get ticket status color
export function getTicketStatusColor(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    unscratched: 'text-blue-500 bg-blue-50',
    scratched: 'text-green-500 bg-green-50',
    claimed: 'text-gray-500 bg-gray-50',
  };
  return colors[status] || 'text-gray-500 bg-gray-50';
}


// Scratch types
export interface TicketContent {
  prize_level: number;
  prize_amount: number;
  win_symbols?: string[];
  areas?: AreaData[];
  game_data?: PatternGameData | unknown;
}

export interface AreaData {
  index: number;
  content: unknown;
  value?: number;
}

// Pattern lottery specific types
export interface PatternGameData {
  pattern_content?: PatternTicketContent;
}

export interface PatternTicketContent {
  areas: PatternAreaData[];
  win_pattern_id: string;
  special_pattern_id: string;
  total_points: number;
  prize_amount: number;
}

export interface PatternAreaData {
  index: number;
  pattern_id: string;
  points: number;
  is_win: boolean;
  is_special: boolean;
}

export interface PatternConfig {
  area_count: number;
  patterns: PatternInfo[];
  special_patterns: PatternInfo[];
  default_points: number[];
}

export interface PatternInfo {
  id: string;
  name: string;
  image_url: string;
  prize_points: number;
  is_special: boolean;
}

export interface ScratchResponse {
  ticket_id: number;
  security_code: string;
  status: TicketStatus;
  prize_amount: number;
  is_win: boolean;
  content?: TicketContent;
  new_balance: number;
  scratched_at?: string;
}

export interface TicketDetail {
  id: number;
  user_id: number;
  lottery_type_id: number;
  security_code: string;
  status: TicketStatus;
  prize_amount?: number;
  content?: TicketContent;
  purchased_at: string;
  scratched_at?: string;
  lottery_type?: LotteryType;
}

// Scratch a ticket
export async function scratchTicket(ticketId: number): Promise<ScratchResponse> {
  return apiClient.post<ScratchResponse>(`/lottery/scratch/${ticketId}`);
}

// Get ticket detail for scratch page
export async function getTicketDetail(ticketId: number): Promise<TicketDetail> {
  return apiClient.get<TicketDetail>(`/lottery/tickets/${ticketId}/detail`);
}
