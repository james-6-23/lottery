import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getWallet,
  getTransactions,
  getTransactionTypeLabel,
  getTransactionTypeColor,
  type WalletResponse,
  type Transaction,
  type TransactionType,
  type TransactionListResponse,
} from '../api/wallet';
import { getPaymentStatus } from '../api/payment';

const TRANSACTION_TYPES: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'initial', label: '注册赠送' },
  { value: 'recharge', label: '充值' },
  { value: 'purchase', label: '购买彩票' },
  { value: 'win', label: '中奖' },
  { value: 'exchange', label: '兑换商品' },
];

const PAGE_SIZE = 20;

export function Wallet() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<TransactionType | ''>('');

  // Fetch wallet info
  const fetchWallet = useCallback(async () => {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取钱包信息失败');
    }
  }, []);

  // Fetch payment status
  const fetchPaymentStatus = useCallback(async () => {
    try {
      const status = await getPaymentStatus();
      setPaymentEnabled(status.payment_enabled);
    } catch (err) {
      // Silently fail - payment status is not critical
      console.error('Failed to fetch payment status:', err);
    }
  }, []);

  // Fetch transactions with pagination and filter
  const fetchTransactions = useCallback(async (page: number, type: TransactionType | '') => {
    try {
      const data: TransactionListResponse = await getTransactions({
        page,
        limit: PAGE_SIZE,
        type: type || undefined,
      });
      setTransactions(data.transactions);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setCurrentPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取交易记录失败');
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
      await Promise.all([
        fetchWallet(),
        fetchTransactions(1, ''),
        fetchPaymentStatus(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated, authLoading, navigate, fetchWallet, fetchTransactions, fetchPaymentStatus]);

  // Handle filter change
  const handleFilterChange = (type: TransactionType | '') => {
    setFilterType(type);
    setCurrentPage(1);
    fetchTransactions(1, type);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page, filterType);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format amount with sign
  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount}`;
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">我的钱包</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">当前余额</p>
            <p className="text-4xl font-bold text-primary">
              {wallet?.balance ?? 0}
              <span className="text-lg ml-1">积分</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {paymentEnabled && (
              <Link
                to="/recharge"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
              >
                充值
              </Link>
            )}
            <div className="text-6xl">💰</div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">交易记录</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">筛选：</span>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value as TransactionType | '')}
              className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无交易记录
          </div>
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
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条记录，第 {currentPage} / {totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
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
    </div>
  );
}
