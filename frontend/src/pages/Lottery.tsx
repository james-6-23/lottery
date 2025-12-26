import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLotteryTypes,
  getGameTypeLabel,
  getStatusLabel,
  formatPrice,
  formatPrize,
  type LotteryType,
  type GameType,
  type LotteryTypeListResponse,
} from '../api/lottery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trophy, Loader2, AlertCircle, ChevronLeft, ChevronRight, Ban, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const GAME_TYPES: { value: GameType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'number_match', label: '数字匹配' },
  { value: 'symbol_match', label: '符号匹配' },
  { value: 'amount_sum', label: '金额累加' },
  { value: 'multiplier', label: '翻倍型' },
  { value: 'pattern', label: '图案型' },
];

const PAGE_SIZE = 12;

export function Lottery() {
  const navigate = useNavigate();
  
  const [lotteryTypes, setLotteryTypes] = useState<LotteryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterGameType, setFilterGameType] = useState<GameType | ''>('');

  // Fetch lottery types with pagination and filter
  const fetchLotteryTypes = useCallback(async (page: number, gameType: GameType | '') => {
    try {
      setLoading(true);
      setError(null);
      const data: LotteryTypeListResponse = await getLotteryTypes({
        page,
        limit: PAGE_SIZE,
        game_type: gameType || undefined,
      });
      setLotteryTypes(data.lottery_types);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setCurrentPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取彩票列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLotteryTypes(1, '');
  }, [fetchLotteryTypes]);

  // Handle filter change
  const handleFilterChange = (gameType: GameType | '') => {
    setFilterGameType(gameType);
    setCurrentPage(1);
    fetchLotteryTypes(1, gameType);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLotteryTypes(page, filterGameType);
  };

  // Handle lottery card click
  const handleLotteryClick = (lottery: LotteryType) => {
    if (lottery.status === 'available' && lottery.stock > 0) {
      navigate(`/lottery/${lottery.id}`);
    }
  };

  // Get lottery card emoji based on game type
  const getLotteryEmoji = (gameType: GameType): string => {
    const emojis: Record<GameType, string> = {
      number_match: '🔢',
      symbol_match: '🎰',
      amount_sum: '💰',
      multiplier: '✖️',
      pattern: '🎨',
    };
    return emojis[gameType] || '🎫';
  };

  if (loading && lotteryTypes.length === 0) {
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">出错了</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button
          onClick={() => fetchLotteryTypes(currentPage, filterGameType)}
          variant="default"
        >
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">彩票大厅</h1>
          <p className="text-muted-foreground text-lg">选择你喜欢的彩票类型，赢取丰厚奖金！</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {GAME_TYPES.map((type) => (
            <Button
              key={type.value || 'all'}
              variant={filterGameType === type.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange(type.value)}
              className={cn(
                "rounded-full px-4 h-9 font-medium transition-all",
                filterGameType === type.value && "bg-secondary hover:bg-secondary/80 shadow-sm"
              )}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lottery Grid */}
      {lotteryTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center glass-card rounded-3xl border-dashed">
          <div className="p-6 bg-muted/50 rounded-full mb-6">
            <Ticket className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">暂无彩票</h3>
          <p className="text-muted-foreground mt-2">该分类下暂时没有可用的彩票类型。</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {lotteryTypes.map((lottery) => (
              <LotteryCard
                key={lottery.id}
                lottery={lottery}
                emoji={getLotteryEmoji(lottery.game_type)}
                onClick={() => handleLotteryClick(lottery)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 mt-16">
              <div className="flex items-center gap-4 p-1 bg-secondary/50 rounded-full backdrop-blur-sm border border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm font-mono px-4 text-muted-foreground">
                   {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">共 {total} 种彩票</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Lottery Card Component
interface LotteryCardProps {
  lottery: LotteryType;
  emoji: string;
  onClick: () => void;
}

function LotteryCard({ lottery, emoji, onClick }: LotteryCardProps) {
  const isAvailable = lottery.status === 'available' && lottery.stock > 0;
  const isSoldOut = lottery.status === 'sold_out' || lottery.stock === 0;

  return (
    <Card 
      onClick={isAvailable ? onClick : undefined}
      className={cn(
        "glass-card border-border/40 overflow-hidden transition-all duration-500 group flex flex-col h-full",
        isAvailable 
          ? "cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20" 
          : "opacity-60 grayscale cursor-not-allowed bg-muted/20"
      )}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-secondary/50 to-muted/30 flex items-center justify-center overflow-hidden">
        {lottery.cover_image ? (
          <img
            src={lottery.cover_image}
            alt={lottery.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="relative z-10 text-7xl transition-transform duration-500 group-hover:scale-125 select-none filter drop-shadow-lg">
            {emoji}
          </div>
        )}
        
        {/* Shine effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out z-20 pointer-events-none" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-20">
           {isSoldOut ? (
             <Badge variant="destructive" className="uppercase font-bold tracking-wider px-3 py-1 bg-destructive text-destructive-foreground">已售罄</Badge>
           ) : lottery.status !== 'available' ? (
             <Badge variant="secondary" className="uppercase px-3 py-1 backdrop-blur-md bg-black/50 text-white border-0">{getStatusLabel(lottery.status)}</Badge>
           ) : (
             <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-3 py-1 shadow-lg shadow-emerald-500/20 backdrop-blur-md font-bold tracking-wide">
               <Zap className="w-3 h-3 mr-1 fill-current" /> 热销中
             </Badge>
           )}
        </div>
      </div>

      <CardContent className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-bold line-clamp-1 mb-2 group-hover:text-primary transition-colors">{lottery.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-10">
            {lottery.description}
          </p>
        </div>

        <div className="mt-auto space-y-3">
           <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>{getGameTypeLabel(lottery.game_type)}</span>
              <span>剩余 {lottery.stock}</span>
           </div>

           <div className="pt-3 border-t border-border/50 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">票价</p>
                <p className="font-bold text-2xl text-foreground">{formatPrice(lottery.price)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">最高奖金</p>
                <div className="flex items-center justify-end gap-1 font-extrabold text-xl text-amber-500 dark:text-amber-400">
                  <Trophy className="w-4 h-4 fill-current" />
                  {formatPrize(lottery.max_prize)}
                </div>
              </div>
           </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Button 
          className={cn(
            "w-full h-11 font-semibold text-base transition-all duration-300",
            isAvailable && "group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20"
          )}
          disabled={!isAvailable}
          variant={isAvailable ? "secondary" : "ghost"}
        >
          {isSoldOut ? (
            <>
              <Ban className="w-4 h-4 mr-2" /> 已售罄
            </>
          ) : !isAvailable ? (
            getStatusLabel(lottery.status)
          ) : (
            <>
              立即购买 <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
