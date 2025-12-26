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
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Trophy, Filter, Loader2, AlertCircle, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">彩票大厅</h1>
          <p className="text-muted-foreground mt-1">选择你喜欢的彩票类型，赢取丰厚奖金！</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
        <Filter className="w-4 h-4 text-muted-foreground mr-2" />
        {GAME_TYPES.map((type) => (
          <Button
            key={type.value || 'all'}
            variant={filterGameType === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(type.value)}
            className="rounded-full"
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Lottery Grid */}
      {lotteryTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10 border-dashed">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Ticket className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">暂无彩票</h3>
          <p className="text-muted-foreground">该分类下暂时没有可用的彩票类型。</p>
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
            <div className="flex flex-col items-center gap-2 mt-12">
              <div className="flex items-center gap-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
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
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">共 {total} 个彩票</p>
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
        "group overflow-hidden transition-all duration-300 hover:shadow-lg",
        isAvailable ? "cursor-pointer hover:-translate-y-1 hover:border-primary/50" : "opacity-80 cursor-not-allowed bg-muted/50"
      )}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center overflow-hidden">
        {lottery.cover_image ? (
          <img
            src={lottery.cover_image}
            alt={lottery.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-6xl transition-transform duration-300 group-hover:scale-110 select-none">{emoji}</span>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
           {isSoldOut ? (
             <Badge variant="destructive" className="uppercase">已售罄</Badge>
           ) : lottery.status !== 'available' ? (
             <Badge variant="secondary" className="uppercase">{getStatusLabel(lottery.status)}</Badge>
           ) : (
             <Badge variant="default" className="bg-green-600 hover:bg-green-700">热销中</Badge>
           )}
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-1">{lottery.name}</CardTitle>
        </div>
        <CardDescription className="line-clamp-2 h-10 text-xs">
          {lottery.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
         <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              {getGameTypeLabel(lottery.game_type)}
            </span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full bg-secondary", lottery.stock < 100 && "text-destructive bg-destructive/10")}>
              仅剩 {lottery.stock} 张
            </span>
         </div>

         <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">票价</p>
              <p className="font-bold text-lg text-primary">{formatPrice(lottery.price)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">最高奖金</p>
              <div className="flex items-center justify-end gap-1 font-bold text-lg text-yellow-600 dark:text-yellow-400">
                <Trophy className="w-3 h-3" />
                {formatPrize(lottery.max_prize)}
              </div>
            </div>
         </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "secondary"}
        >
          {isSoldOut ? (
            <>
              <Ban className="w-4 h-4 mr-2" /> 已售罄
            </>
          ) : !isAvailable ? (
            getStatusLabel(lottery.status)
          ) : (
            <>
              立即购买 <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
