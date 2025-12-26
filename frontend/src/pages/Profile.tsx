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
  type Transaction,
  type TransactionType,
} from '../api/wallet';
import {
  getExchangeRecords,
  type ExchangeRecord,
} from '../api/exchange';
import { getTicketStatusLabel, type TicketStatus } from '../api/lottery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Crown, Calendar, Coins, BarChart3, Ticket, Trophy, Receipt, ShoppingCart, Copy, ChevronLeft, ChevronRight, Filter, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const TICKET_STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'unscratched', label: '未刮开' },
  { value: 'scratched', label: '已刮开' },
  { value: 'claimed', label: '已兑奖' },
];

const TRANSACTION_TYPES: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'initial', label: '注册赠送' },
  { value: 'recharge', label: '充值' },
  { value: 'purchase', label: '购买彩票' },
  { value: 'win', label: '中奖' },
  { value: 'exchange', label: '兑换商品' },
];

export function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
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
      await Promise.all([
        fetchTickets(1, ''),
        fetchWins(1),
        fetchTransactions(1, ''),
        fetchExchanges(1)
      ]);
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated, authLoading, navigate, fetchProfileData, fetchTickets, fetchWins, fetchTransactions, fetchExchanges]);

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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Profile Header */}
      <Card className="border-none shadow-md bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-8">
           <div className="flex flex-col md:flex-row items-center gap-8">
             <div className="relative">
                <div className="w-24 h-24 rounded-full bg-background p-1 shadow-sm">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                      {profile?.role === 'admin' ? '👑' : '👤'}
                    </div>
                  )}
                </div>
                {profile?.role === 'admin' && (
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 hover:bg-yellow-600">
                    <Crown className="w-3 h-3 mr-1" /> 管理员
                  </Badge>
                )}
             </div>
             
             <div className="flex-1 text-center md:text-left space-y-2">
               <h1 className="text-3xl font-bold">{profile?.username}</h1>
               <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                 <span className="flex items-center gap-1">
                   <Calendar className="w-4 h-4" />
                   注册于 {profile?.created_at ? formatDate(profile.created_at) : '-'}
                 </span>
                 <span className="flex items-center gap-1">
                   <Coins className="w-4 h-4" />
                   余额: <span className="font-semibold text-primary">{profile?.balance ?? 0}</span>
                 </span>
               </div>
             </div>
           </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto flex-nowrap mb-6">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
            <BarChart3 className="w-4 h-4" /> 数据概览
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2 data-[state=active]:bg-background">
            <Ticket className="w-4 h-4" /> 购彩记录
          </TabsTrigger>
          <TabsTrigger value="wins" className="gap-2 data-[state=active]:bg-background">
            <Trophy className="w-4 h-4" /> 中奖记录
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 data-[state=active]:bg-background">
            <Receipt className="w-4 h-4" /> 积分明细
          </TabsTrigger>
          <TabsTrigger value="exchanges" className="gap-2 data-[state=active]:bg-background">
            <ShoppingCart className="w-4 h-4" /> 兑换记录
          </TabsTrigger>
        </TabsList>


        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {statistics && (
            <div className="grid gap-6">
               {/* Stats Cards */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: '累计购彩', value: statistics.total_purchases, icon: Ticket, color: 'text-blue-500' },
                   { label: '累计花费', value: statistics.total_spent, icon: Coins, color: 'text-orange-500' },
                   { label: '中奖次数', value: statistics.total_wins, icon: Award, color: 'text-yellow-500' },
                   { label: '累计奖金', value: statistics.total_win_amount, icon: Trophy, color: 'text-red-500' },
                 ].map((stat, i) => (
                   <Card key={i}>
                     <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                       <stat.icon className={cn("w-8 h-8 mb-2", stat.color)} />
                       <span className="text-3xl font-bold">{stat.value}</span>
                       <span className="text-sm text-muted-foreground">{stat.label}</span>
                     </CardContent>
                   </Card>
                 ))}
               </div>
               
               {/* Detailed Stats */}
               <div className="grid md:grid-cols-2 gap-6">
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                       <BarChart3 className="w-5 h-5" /> 游戏数据
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="flex justify-between items-center py-2 border-b">
                       <span className="text-muted-foreground">中奖率</span>
                       <span className="font-mono font-semibold">{statistics.win_rate.toFixed(1)}%</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b">
                       <span className="text-muted-foreground">最高单次中奖</span>
                       <span className="font-mono font-semibold text-primary">{statistics.max_single_win}</span>
                     </div>
                     <div className="flex justify-between items-center py-2">
                       <span className="text-muted-foreground">净收益</span>
                       <span className={cn(
                         "font-mono font-semibold",
                         statistics.total_win_amount - statistics.total_spent >= 0 ? "text-green-600" : "text-destructive"
                       )}>
                         {statistics.total_win_amount - statistics.total_spent >= 0 ? '+' : ''}
                         {statistics.total_win_amount - statistics.total_spent}
                       </span>
                     </div>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                       <ShoppingCart className="w-5 h-5" /> 商城数据
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="flex justify-between items-center py-2 border-b">
                       <span className="text-muted-foreground">兑换次数</span>
                       <span className="font-mono font-semibold">{statistics.total_exchanges}</span>
                     </div>
                     <div className="flex justify-between items-center py-2">
                       <span className="text-muted-foreground">兑换消耗</span>
                       <span className="font-mono font-semibold">{statistics.total_exchange_spent} 积分</span>
                     </div>
                   </CardContent>
                 </Card>
               </div>
            </div>
          )}
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="text-lg">购彩记录</CardTitle>
                <div className="flex items-center gap-2">
                   <Filter className="w-4 h-4 text-muted-foreground" />
                   <div className="flex flex-wrap gap-2">
                     {TICKET_STATUS_OPTIONS.map((opt) => (
                       <Button
                         key={opt.value || 'all'}
                         variant={ticketStatusFilter === opt.value ? "secondary" : "ghost"}
                         size="sm"
                         onClick={() => handleTicketFilterChange(opt.value)}
                         className="h-8 rounded-full text-xs"
                       >
                         {opt.label}
                       </Button>
                     ))}
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {tickets.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">暂无购彩记录</div>
               ) : (
                 <div className="divide-y">
                   {tickets.map((ticket) => (
                     <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                           🎫
                         </div>
                         <div>
                           <p className="font-medium">{ticket.lottery_name}</p>
                           <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                             <code className="px-1.5 py-0.5 bg-muted rounded border">{ticket.security_code}</code>
                             <span>{formatDate(ticket.purchased_at)}</span>
                           </div>
                         </div>
                       </div>
                       <div className="text-right">
                         <Badge variant={
                           ticket.status === 'claimed' ? 'default' : 
                           ticket.status === 'scratched' ? 'secondary' : 
                           'outline'
                         } className={cn(
                           ticket.status === 'claimed' && "bg-green-600 hover:bg-green-700"
                         )}>
                           {getTicketStatusLabel(ticket.status)}
                         </Badge>
                         <div className="mt-1 text-xs">
                           <span className="text-muted-foreground">花费: {ticket.price}</span>
                           {ticket.prize_amount !== undefined && ticket.prize_amount > 0 && (
                             <span className="text-green-600 ml-2 font-medium">中奖: +{ticket.prize_amount}</span>
                           )}
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </CardContent>
            {ticketTotalPages > 1 && (
              <div className="p-4 border-t flex flex-col items-center gap-2">
                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => fetchTickets(ticketPage - 1, ticketStatusFilter)} disabled={ticketPage <= 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">{ticketPage} / {ticketTotalPages}</span>
                  <Button variant="outline" size="icon" onClick={() => fetchTickets(ticketPage + 1, ticketStatusFilter)} disabled={ticketPage >= ticketTotalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">共 {ticketTotal} 条记录</p>
              </div>
            )}
          </Card>
        </TabsContent>


        {/* Wins Tab */}
        <TabsContent value="wins">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">中奖记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {wins.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">暂无中奖记录</div>
               ) : (
                 <div className="divide-y">
                   {wins.map((win) => (
                     <div key={win.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-lg">
                           🎉
                         </div>
                         <div>
                           <p className="font-medium">{win.lottery_name}</p>
                           <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                             <code className="px-1.5 py-0.5 bg-muted rounded border">{win.security_code}</code>
                             <span>{formatDate(win.scratched_at)}</span>
                           </div>
                         </div>
                       </div>
                       <div className="text-right">
                         <span className="text-lg font-bold text-green-600 dark:text-green-400">+{win.prize_amount}</span>
                         <p className="text-xs text-muted-foreground">积分</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </CardContent>
            {winTotalPages > 1 && (
              <div className="p-4 border-t flex flex-col items-center gap-2">
                <div className="flex justify-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => fetchWins(winPage - 1)} disabled={winPage <= 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">{winPage} / {winTotalPages}</span>
                  <Button variant="outline" size="icon" onClick={() => fetchWins(winPage + 1)} disabled={winPage >= winTotalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">共 {winTotal} 条记录</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
             <CardHeader className="border-b pb-4">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <CardTitle className="text-lg">积分明细</CardTitle>
                 <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {TRANSACTION_TYPES.map((type) => (
                        <Button
                          key={type.value || 'all'}
                          variant={transactionTypeFilter === type.value ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => handleTransactionFilterChange(type.value)}
                          className="h-8 rounded-full text-xs"
                        >
                          {type.label}
                        </Button>
                      ))}
                    </div>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="p-0">
               {transactions.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">暂无交易记录</div>
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
             {transactionTotalPages > 1 && (
               <div className="p-4 border-t flex flex-col items-center gap-2">
                 <div className="flex justify-center gap-4">
                   <Button variant="outline" size="icon" onClick={() => fetchTransactions(transactionPage - 1, transactionTypeFilter)} disabled={transactionPage <= 1}>
                     <ChevronLeft className="w-4 h-4" />
                   </Button>
                   <span className="flex items-center text-sm text-muted-foreground">{transactionPage} / {transactionTotalPages}</span>
                   <Button variant="outline" size="icon" onClick={() => fetchTransactions(transactionPage + 1, transactionTypeFilter)} disabled={transactionPage >= transactionTotalPages}>
                     <ChevronRight className="w-4 h-4" />
                   </Button>
                 </div>
                 <p className="text-xs text-muted-foreground">共 {transactionTotal} 条记录</p>
               </div>
             )}
          </Card>
        </TabsContent>

        {/* Exchanges Tab */}
        <TabsContent value="exchanges">
           <Card>
             <CardHeader className="border-b">
               <CardTitle className="text-lg">兑换记录</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               {exchanges.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">暂无兑换记录</div>
               ) : (
                 <div className="divide-y">
                   {exchanges.map((record) => (
                     <div key={record.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-lg">
                           🛒
                         </div>
                         <div>
                           <p className="font-medium">{record.product_name}</p>
                           <p className="text-xs text-muted-foreground mt-1">{formatDate(record.created_at)}</p>
                         </div>
                       </div>
                       
                       <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                         <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1 border">
                           <span className="text-xs text-muted-foreground">卡密:</span>
                           <code className="text-sm font-mono select-all">{record.card_key}</code>
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(record.card_key)}>
                             <Copy className="w-3 h-3" />
                           </Button>
                         </div>
                         <span className="font-bold text-orange-500">-{record.cost} 积分</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </CardContent>
             {exchangeTotalPages > 1 && (
               <div className="p-4 border-t flex flex-col items-center gap-2">
                 <div className="flex justify-center gap-4">
                   <Button variant="outline" size="icon" onClick={() => fetchExchanges(exchangePage - 1)} disabled={exchangePage <= 1}>
                     <ChevronLeft className="w-4 h-4" />
                   </Button>
                   <span className="flex items-center text-sm text-muted-foreground">{exchangePage} / {exchangeTotalPages}</span>
                   <Button variant="outline" size="icon" onClick={() => fetchExchanges(exchangePage + 1)} disabled={exchangePage >= exchangeTotalPages}>
                     <ChevronRight className="w-4 h-4" />
                   </Button>
                 </div>
                 <p className="text-xs text-muted-foreground">共 {exchangeTotal} 条记录</p>
               </div>
             )}
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}