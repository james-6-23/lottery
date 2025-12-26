import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getUserProfile,
  getUserStatistics,
  getUserTickets,
  getUserWins,
  formatDate,
  type UserProfile,
  type UserStatistics,
  type TicketRecord,
  type WinRecord,
  type TicketRecordQuery,
} from '../api/user';
import {
  getTransactions,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  type Transaction,
  type TransactionType,
} from '../api/wallet';
import {
  getExchangeRecords,
  type ExchangeRecord,
} from '../api/exchange';
import { getTicketStatusLabel, getTicketStatusColor, type TicketStatus } from '../api/lottery';

type TabType = 'overview' | 'tickets' | 'wins' | 'transactions' | 'exchanges';

const PAGE_SIZE = 20;

const TICKET_STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'unscratched', label: '未刮开' },
  { value: 'scratched', label: '已刮开' },
  { value: 'claimed', label: '已兑奖' },
];

const TRANSACTION_TYPES: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'initial', label: '注册赠送' },
  { value: 'recharge', label: '充值' },
  { value: 'purchase', label: '购买彩票' },
  { value: 'win', label: '中奖' },
  { value: 'exchange', label: '兑换商品' },
];

export function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tickets state
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotalPages, setTicketTotalPages] = useState(1);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | ''>('');
  
  // Wins state
  const [wins, setWins] = useState<WinRecord[]>([]);
  const [winPage, setWinPage] = useState(1);
  const [winTotalPages, setWinTotalPages] = useState(1);
  const [winTotal, setWinTotal] = useState(0);
  
  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionType | ''>('');
  
  // Exchanges state
  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);
  const [exchangePage, setExchangePage] = useState(1);
  const [exchangeTotalPages, setExchangeTotalPages] = useState(1);
  const [exchangeTotal, setExchangeTotal] = useState(0);

  // Fetch profile and statistics
  const fetchProfileData = useCallback(async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        getUserProfile(),
        getUserStatistics(),
      ]);
      setProfile(profileData);
      setStatistics(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户信息失败');
    }
  }, []);

  // Fetch tickets
  const fetchTickets = useCallback(async (page: number, status: TicketStatus | '') => {
    try {
      const query: TicketRecordQuery = { page, limit: PAGE_SIZE };
      if (status) query.status = status;
      const data = await getUserTickets(query);
      setTickets(data.tickets);
      setTicketPage(data.page);
      setTicketTotalPages(data.total_pages);
      setTicketTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    }
  }, []);

  // Fetch wins
  const fetchWins = useCallback(async (page: number) => {
    try {
      const data = await getUserWins(page, PAGE_SIZE);
      setWins(data.wins);
      setWinPage(data.page);
      setWinTotalPages(data.total_pages);
      setWinTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch wins:', err);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page: number, type: TransactionType | '') => {
    try {
      const data = await getTransactions({ page, limit: PAGE_SIZE, type: type || undefined });
      setTransactions(data.transactions);
      setTransactionPage(data.page);
      setTransactionTotalPages(data.total_pages);
      setTransactionTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, []);

  // Fetch exchanges
  const fetchExchanges = useCallback(async (page: number) => {
    try {
      const data = await getExchangeRecords({ page, limit: PAGE_SIZE });
      setExchanges(data.records);
      setExchangePage(data.page);
      setExchangeTotalPages(data.total_pages);
      setExchangeTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch exchanges:', err);
    }
  }, []);


  // Initial load
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      await fetchProfileData();
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated, authLoading, navigate, fetchProfileData]);

  // Load tab data when tab changes
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    
    // Use a flag to track if the effect should run
    let cancelled = false;
    
    const loadTabData = async () => {
      switch (activeTab) {
        case 'tickets':
          if (!cancelled) await fetchTickets(1, ticketStatusFilter);
          break;
        case 'wins':
          if (!cancelled) await fetchWins(1);
          break;
        case 'transactions':
          if (!cancelled) await fetchTransactions(1, transactionTypeFilter);
          break;
        case 'exchanges':
          if (!cancelled) await fetchExchanges(1);
          break;
      }
    };
    
    loadTabData();
    
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAuthenticated, loading, ticketStatusFilter, transactionTypeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ticket filter change
  const handleTicketFilterChange = (status: TicketStatus | '') => {
    setTicketStatusFilter(status);
    fetchTickets(1, status);
  };

  // Handle transaction filter change
  const handleTransactionFilterChange = (type: TransactionType | '') => {
    setTransactionTypeFilter(type);
    fetchTransactions(1, type);
  };

  // Format amount with sign
  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount}`;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{profile?.role === 'admin' ? '👑' : '👤'}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{profile?.username}</h1>
            <p className="text-muted-foreground text-sm mb-2">
              注册时间：{profile?.created_at ? formatDate(profile.created_at) : '-'}
            </p>
            <div className="flex items-center gap-4">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                {profile?.balance ?? 0} 积分
              </span>
              {profile?.role === 'admin' && (
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                  管理员
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        {[
          { key: 'overview', label: '数据概览', icon: '📊' },
          { key: 'tickets', label: '购彩记录', icon: '🎫' },
          { key: 'wins', label: '中奖记录', icon: '🎉' },
          { key: 'transactions', label: '积分明细', icon: '💰' },
          { key: 'exchanges', label: '兑换记录', icon: '🛒' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>


      {/* Overview Tab */}
      {activeTab === 'overview' && statistics && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border p-4">
              <div className="text-3xl mb-2">🎫</div>
              <p className="text-2xl font-bold">{statistics.total_purchases}</p>
              <p className="text-sm text-muted-foreground">累计购彩</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <div className="text-3xl mb-2">💸</div>
              <p className="text-2xl font-bold">{statistics.total_spent}</p>
              <p className="text-sm text-muted-foreground">累计花费</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-2xl font-bold">{statistics.total_wins}</p>
              <p className="text-sm text-muted-foreground">中奖次数</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-2xl font-bold">{statistics.total_win_amount}</p>
              <p className="text-sm text-muted-foreground">累计奖金</p>
            </div>
          </div>

          {/* More Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">🎰 游戏统计</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">中奖率</span>
                  <span className="font-semibold">{statistics.win_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">最高单次中奖</span>
                  <span className="font-semibold text-primary">{statistics.max_single_win} 积分</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">净收益</span>
                  <span className={`font-semibold ${statistics.total_win_amount - statistics.total_spent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.total_win_amount - statistics.total_spent >= 0 ? '+' : ''}{statistics.total_win_amount - statistics.total_spent} 积分
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">🛒 兑换统计</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">兑换次数</span>
                  <span className="font-semibold">{statistics.total_exchanges}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">兑换消耗</span>
                  <span className="font-semibold">{statistics.total_exchange_spent} 积分</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">购彩记录</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">筛选：</span>
              <select
                value={ticketStatusFilter}
                onChange={(e) => handleTicketFilterChange(e.target.value as TicketStatus | '')}
                className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TICKET_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无购彩记录</div>
          ) : (
            <>
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg">🎫</span>
                      </div>
                      <div>
                        <p className="font-medium">{ticket.lottery_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{ticket.security_code}</code>
                          <span>·</span>
                          <span>{formatDate(ticket.purchased_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm px-2 py-1 rounded ${getTicketStatusColor(ticket.status)}`}>
                        {getTicketStatusLabel(ticket.status)}
                      </span>
                      <div className="mt-1">
                        <span className="text-sm text-muted-foreground">花费: {ticket.price}</span>
                        {ticket.prize_amount !== undefined && ticket.prize_amount > 0 && (
                          <span className="text-sm text-green-600 ml-2">中奖: +{ticket.prize_amount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {ticketTotalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    共 {ticketTotal} 条记录，第 {ticketPage} / {ticketTotalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchTickets(ticketPage - 1, ticketStatusFilter)}
                      disabled={ticketPage <= 1}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => fetchTickets(ticketPage + 1, ticketStatusFilter)}
                      disabled={ticketPage >= ticketTotalPages}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* Wins Tab */}
      {activeTab === 'wins' && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">中奖记录</h2>
          </div>

          {wins.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无中奖记录</div>
          ) : (
            <>
              <div className="divide-y">
                {wins.map((win) => (
                  <div key={win.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-lg">🎉</span>
                      </div>
                      <div>
                        <p className="font-medium">{win.lottery_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{win.security_code}</code>
                          <span>·</span>
                          <span>{formatDate(win.scratched_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-green-600">+{win.prize_amount}</span>
                      <p className="text-sm text-muted-foreground">积分</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {winTotalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    共 {winTotal} 条记录，第 {winPage} / {winTotalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchWins(winPage - 1)}
                      disabled={winPage <= 1}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => fetchWins(winPage + 1)}
                      disabled={winPage >= winTotalPages}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">积分明细</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">筛选：</span>
              <select
                value={transactionTypeFilter}
                onChange={(e) => handleTransactionFilterChange(e.target.value as TransactionType | '')}
                className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无交易记录</div>
          ) : (
            <>
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.amount >= 0 ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <span className="text-lg">
                          {tx.type === 'initial' && '🎁'}
                          {tx.type === 'recharge' && '💳'}
                          {tx.type === 'purchase' && '🎫'}
                          {tx.type === 'win' && '🎉'}
                          {tx.type === 'exchange' && '🛒'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={getTransactionTypeColor(tx.type)}>
                            {getTransactionTypeLabel(tx.type)}
                          </span>
                          <span>·</span>
                          <span>{formatDate(tx.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {formatAmount(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {transactionTotalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    共 {transactionTotal} 条记录，第 {transactionPage} / {transactionTotalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchTransactions(transactionPage - 1, transactionTypeFilter)}
                      disabled={transactionPage <= 1}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => fetchTransactions(transactionPage + 1, transactionTypeFilter)}
                      disabled={transactionPage >= transactionTotalPages}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Exchanges Tab */}
      {activeTab === 'exchanges' && (
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">兑换记录</h2>
          </div>

          {exchanges.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">暂无兑换记录</div>
          ) : (
            <>
              <div className="divide-y">
                {exchanges.map((record) => (
                  <div key={record.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-lg">🛒</span>
                        </div>
                        <div>
                          <p className="font-medium">{record.product_name}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(record.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-orange-500 font-medium">-{record.cost} 积分</span>
                    </div>
                    <div className="ml-13 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">卡密：</span>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{record.card_key}</code>
                      <button
                        onClick={() => copyToClipboard(record.card_key)}
                        className="text-primary hover:text-primary/80 text-sm"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {exchangeTotalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    共 {exchangeTotal} 条记录，第 {exchangePage} / {exchangeTotalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchExchanges(exchangePage - 1)}
                      disabled={exchangePage <= 1}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => fetchExchanges(exchangePage + 1)}
                      disabled={exchangePage >= exchangeTotalPages}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
