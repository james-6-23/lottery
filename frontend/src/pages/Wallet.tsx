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
import { Wallet as WalletIcon, Plus, History, Loader2, ArrowLeft, ArrowRight, Filter, TrendingUp, TrendingDown, Clock } from 'lucide-react';
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">我的钱包</h1>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-none shadow-2xl overflow-hidden relative group">
         <div className="absolute -right-20 -top-20 text-primary-foreground/10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
            <WalletIcon className="w-64 h-64" />
         </div>
         <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
         <CardContent className="p-10 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
               <div className="space-y-2">
                  <p className="text-primary-foreground/80 font-medium text-sm uppercase tracking-widest">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-bold tracking-tight tabular-nums">{wallet?.balance ?? 0}</span>
                     <span className="text-xl opacity-80 font-medium">积分</span>
                  </div>
               </div>
               
               {paymentEnabled && (
                 <Link to="/recharge">
                   <Button size="lg" variant="secondary" className="shadow-lg gap-2 h-12 px-8 font-semibold text-primary hover:bg-white">
                     <Plus className="w-5 h-5" /> 充值
                   </Button>
                 </Link>
               )}
            </div>
         </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="glass-card border-border/40">
        <CardHeader className="border-b border-border/40 pb-6 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-primary/10 rounded-lg">
                 <History className="w-5 h-5 text-primary" />
               </div>
               <CardTitle className="text-lg">交易记录</CardTitle>
            </div>
            
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
               <Filter className="w-4 h-4 text-muted-foreground mr-1 self-center" />
               {TRANSACTION_TYPES.map((type) => (
                 <Button
                    key={type.value || 'all'}
                    variant={filterType === type.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleFilterChange(type.value)}
                    className={cn(
                      "h-8 rounded-full text-xs transition-all",
                      filterType === type.value && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                 >
                   {type.label}
                 </Button>
               ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Clock className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p>暂无交易记录</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-105",
                      tx.amount >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}>
                        {tx.amount >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-base">{tx.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal text-[10px] h-5 px-1.5 border-border/60">
                          {getTransactionTypeLabel(tx.type)}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(tx.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-bold font-mono tracking-tight tabular-nums",
                    tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
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
              className="rounded-full border-border/40"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-mono bg-muted/30 px-3 py-1 rounded-full">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border/40"
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