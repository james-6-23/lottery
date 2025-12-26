import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getWallet,
  getTransactions,
  getTransactionTypeLabel,
  type WalletResponse,
  type Transaction,
  type TransactionType,
  type TransactionListResponse,
} from '../api/wallet';
import { getPaymentStatus } from '../api/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, Plus, History, Loader2, ArrowLeft, ArrowRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRANSACTION_TYPES: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: '全部' },
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
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">我的钱包</h1>
      </div>

      {/* Balance Card */}
      <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative">
         <div className="absolute -right-10 -top-10 text-primary-foreground/10">
            <WalletIcon className="w-48 h-48" />
         </div>
         <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                  <p className="text-primary-foreground/80 font-medium mb-2">当前余额</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-5xl font-bold">{wallet?.balance ?? 0}</span>
                     <span className="text-lg opacity-80">积分</span>
                  </div>
               </div>
               
               {paymentEnabled && (
                 <Link to="/recharge">
                   <Button size="lg" variant="secondary" className="shadow-lg gap-2">
                     <Plus className="w-5 h-5" /> 充值
                   </Button>
                 </Link>
               )}
            </div>
         </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
               <History className="w-5 h-5 text-muted-foreground" />
               <CardTitle>交易记录</CardTitle>
            </div>
            
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
               <Filter className="w-4 h-4 text-muted-foreground mr-1 self-center" />
               {TRANSACTION_TYPES.map((type) => (
                 <Button
                    key={type.value || 'all'}
                    variant={filterType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange(type.value)}
                    className="h-8 rounded-full text-xs"
                 >
                   {type.label}
                 </Button>
               ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              暂无交易记录
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg",
                      tx.amount >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    )}>
                        {tx.type === 'initial' && '🎁'}
                        {tx.type === 'recharge' && '💳'}
                        {tx.type === 'purchase' && '🎫'}
                        {tx.type === 'win' && '🎉'}
                        {tx.type === 'exchange' && '🛒'}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="outline" className="font-normal text-[10px] h-5 px-1.5">
                          {getTransactionTypeLabel(tx.type)}
                        </Badge>
                        <span>{formatDate(tx.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-bold font-mono",
                    tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                  )}>
                    {formatAmount(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">共 {total} 条记录</p>
        </div>
      )}
    </div>
  );
}
