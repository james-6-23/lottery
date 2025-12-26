import { apiClient } from './client';

// ==================== Dashboard ====================

export interface DashboardStats {
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  total_tickets_sold: number;
  total_revenue: number;
  total_prizes_paid: number;
  total_exchanges: number;
  active_prize_pools: number;
  available_stock: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/admin/dashboard');
}

// ==================== User Management ====================

export interface AdminUser {
  id: number;
  linuxdo_id: string;
  username: string;
  avatar: string;
  role: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface UserListQuery {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export async function getUsers(query: UserListQuery = {}): Promise<UserListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.append('search', query.search);
  if (query.role) params.append('role', query.role);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  const queryString = params.toString();
  return apiClient.get<UserListResponse>(`/admin/users${queryString ? `?${queryString}` : ''}`);
}

export async function getUserById(id: number): Promise<AdminUser> {
  return apiClient.get<AdminUser>(`/admin/users/${id}`);
}

export interface AdjustPointsRequest {
  amount: number;
  description?: string;
}

export async function adjustUserPoints(userId: number, req: AdjustPointsRequest): Promise<AdminUser> {
  return apiClient.put<AdminUser>(`/admin/users/${userId}/points`, req);
}

export async function updateUserRole(userId: number, role: string): Promise<AdminUser> {
  return apiClient.put<AdminUser>(`/admin/users/${userId}/role`, { role });
}


// ==================== System Settings ====================

export interface SystemSettings {
  payment_enabled: boolean;
  epay_merchant_id: string;
  epay_secret: string;
  epay_callback_url: string;
}

export interface UpdateSettingsRequest {
  payment_enabled?: boolean;
  epay_merchant_id?: string;
  epay_secret?: string;
  epay_callback_url?: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return apiClient.get<SystemSettings>('/admin/settings');
}

export async function updateSystemSettings(req: UpdateSettingsRequest): Promise<SystemSettings> {
  return apiClient.put<SystemSettings>('/admin/settings', req);
}

// ==================== Admin Logs ====================

export interface AdminLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminLogQuery {
  admin_id?: number;
  action?: string;
  target_type?: string;
  page?: number;
  limit?: number;
}

export interface AdminLogListResponse {
  logs: AdminLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export async function getAdminLogs(query: AdminLogQuery = {}): Promise<AdminLogListResponse> {
  const params = new URLSearchParams();
  if (query.admin_id) params.append('admin_id', query.admin_id.toString());
  if (query.action) params.append('action', query.action);
  if (query.target_type) params.append('target_type', query.target_type);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  const queryString = params.toString();
  return apiClient.get<AdminLogListResponse>(`/admin/logs${queryString ? `?${queryString}` : ''}`);
}

// ==================== Lottery Type Management ====================

export interface PrizeLevel {
  id?: number;
  level: number;
  name: string;
  prize_amount: number;
  quantity: number;
  remaining?: number;
}

export interface LotteryType {
  id: number;
  name: string;
  description: string;
  price: number;
  max_prize: number;
  game_type: string;
  cover_image: string;
  rules_config: string;
  design_config?: string;
  status: string;
  prize_levels?: PrizeLevel[];
  created_at: string;
  updated_at: string;
}

export interface CreateLotteryTypeRequest {
  name: string;
  description: string;
  price: number;
  max_prize: number;
  game_type: string;
  cover_image?: string;
  rules_config?: string;
  design_config?: string;
  prize_levels?: PrizeLevel[];
}

export interface UpdateLotteryTypeRequest {
  name?: string;
  description?: string;
  price?: number;
  max_prize?: number;
  game_type?: string;
  cover_image?: string;
  rules_config?: string;
  design_config?: string;
  status?: string;
}

export async function createLotteryType(req: CreateLotteryTypeRequest): Promise<LotteryType> {
  return apiClient.post<LotteryType>('/admin/lottery/types', req);
}

export async function updateLotteryType(id: number, req: UpdateLotteryTypeRequest): Promise<LotteryType> {
  return apiClient.put<LotteryType>(`/admin/lottery/types/${id}`, req);
}

export async function deleteLotteryType(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/lottery/types/${id}`);
}

export async function updatePrizeLevels(lotteryTypeId: number, prizeLevels: PrizeLevel[]): Promise<void> {
  return apiClient.put<void>(`/admin/lottery/types/${lotteryTypeId}/prize-levels`, { prize_levels: prizeLevels });
}

export interface CreatePrizePoolRequest {
  total_tickets: number;
  return_rate?: number;
}

export interface PrizePool {
  id: number;
  lottery_type_id: number;
  total_tickets: number;
  sold_tickets: number;
  claimed_prizes: number;
  return_rate: number;
  status: string;
  created_at: string;
}

export async function createPrizePool(lotteryTypeId: number, req: CreatePrizePoolRequest): Promise<PrizePool> {
  return apiClient.post<PrizePool>(`/admin/lottery/types/${lotteryTypeId}/prize-pools`, req);
}

export async function getPrizePools(lotteryTypeId: number): Promise<PrizePool[]> {
  return apiClient.get<PrizePool[]>(`/lottery/types/${lotteryTypeId}/prize-pools`);
}

// Save lottery design configuration
export async function saveLotteryDesign(lotteryTypeId: number, designConfig: unknown): Promise<LotteryType> {
  return apiClient.put<LotteryType>(`/admin/lottery/types/${lotteryTypeId}`, { design_config: designConfig });
}


// ==================== Product Management ====================

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  image: string;
  price: number;
  stock: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  image?: string;
  price: number;
  status?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  status?: string;
}

export async function getAllProducts(query: ProductQuery = {}): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (query.status) params.append('status', query.status);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  const queryString = params.toString();
  return apiClient.get<ProductListResponse>(`/admin/exchange/products${queryString ? `?${queryString}` : ''}`);
}

export async function createProduct(req: CreateProductRequest): Promise<AdminProduct> {
  return apiClient.post<AdminProduct>('/admin/exchange/products', req);
}

export async function updateProduct(id: number, req: UpdateProductRequest): Promise<AdminProduct> {
  return apiClient.put<AdminProduct>(`/admin/exchange/products/${id}`, req);
}

export async function deleteProduct(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/exchange/products/${id}`);
}

export interface CardKey {
  id: number;
  product_id: number;
  key_content: string;
  status: string;
  redeemed_by?: number;
  redeemed_at?: string;
}

export async function getCardKeys(productId: number, status?: string): Promise<{ card_keys: CardKey[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiClient.get<{ card_keys: CardKey[]; total: number }>(`/admin/exchange/products/${productId}/card-keys${queryString ? `?${queryString}` : ''}`);
}

export async function importCardKeys(productId: number, cardKeys: string[]): Promise<{ imported: number; message: string }> {
  return apiClient.post<{ imported: number; message: string }>(`/admin/exchange/products/${productId}/import-keys`, { card_keys: cardKeys });
}

// ==================== Helper Functions ====================

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'adjust_points': '调整积分',
    'update_role': '更新角色',
    'update_settings': '更新设置',
    'create_lottery_type': '创建彩票类型',
    'update_lottery_type': '更新彩票类型',
    'delete_lottery_type': '删除彩票类型',
    'create_product': '创建商品',
    'update_product': '更新商品',
    'delete_product': '删除商品',
    'import_card_keys': '导入卡密',
  };
  return labels[action] || action;
}

export function getTargetTypeLabel(targetType: string): string {
  const labels: Record<string, string> = {
    'user': '用户',
    'system': '系统',
    'lottery_type': '彩票类型',
    'product': '商品',
  };
  return labels[targetType] || targetType;
}

// ==================== Statistics ====================

export interface CoreMetrics {
  total_users: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  total_points_inflow: number;
  total_points_outflow: number;
  total_tickets_sold: number;
  total_sales_amount: number;
  total_prizes_paid: number;
  return_rate: number;
  total_exchange_cost: number;
}

export interface TrendData {
  labels: string[];
  data: number[];
  data2?: number[];
}

export interface LotteryTypeStats {
  id: number;
  name: string;
  total_sold: number;
  total_amount: number;
  total_prizes: number;
  return_rate: number;
}

export interface PrizeDistribution {
  level: string;
  count: number;
  amount: number;
}

export interface UserBehaviorStats {
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  avg_purchase_count: number;
  avg_purchase_amount: number;
  retention_rate_7d: number;
  retention_rate_30d: number;
}

export interface StatisticsResponse {
  core_metrics: CoreMetrics;
  user_trend: TrendData;
  sales_trend: TrendData;
  prizes_trend: TrendData;
  lottery_type_stats: LotteryTypeStats[];
  prize_distribution: PrizeDistribution[];
  user_behavior: UserBehaviorStats;
}

export interface StatisticsQuery {
  start_date?: string;
  end_date?: string;
  period?: 'day' | 'week' | 'month';
}

export async function getStatistics(query: StatisticsQuery = {}): Promise<StatisticsResponse> {
  const params = new URLSearchParams();
  if (query.start_date) params.append('start_date', query.start_date);
  if (query.end_date) params.append('end_date', query.end_date);
  if (query.period) params.append('period', query.period);
  const queryString = params.toString();
  return apiClient.get<StatisticsResponse>(`/admin/statistics${queryString ? `?${queryString}` : ''}`);
}

export async function exportStatisticsCSV(query: StatisticsQuery = {}): Promise<Blob> {
  const params = new URLSearchParams();
  if (query.start_date) params.append('start_date', query.start_date);
  if (query.end_date) params.append('end_date', query.end_date);
  if (query.period) params.append('period', query.period);
  const queryString = params.toString();
  
  const token = localStorage.getItem('access_token');
  const response = await fetch(`/api/admin/statistics/export${queryString ? `?${queryString}` : ''}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('导出失败');
  }
  
  return response.blob();
}
