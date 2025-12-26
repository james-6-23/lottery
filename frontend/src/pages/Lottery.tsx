import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLotteryTypes,
  getGameTypeLabel,
  getStatusLabel,
  getStatusColor,
  formatPrice,
  formatPrize,
  type LotteryType,
  type GameType,
  type LotteryTypeListResponse,
} from '../api/lottery';

const GAME_TYPES: { value: GameType | ''; label: string }[] = [
  { value: '', label: '全部类型' },
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
          onClick={() => fetchLotteryTypes(currentPage, filterGameType)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">彩票大厅</h1>
          <p className="text-muted-foreground mt-1">选择你喜欢的彩票类型，试试手气吧！</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">筛选：</span>
          <select
            value={filterGameType}
            onChange={(e) => handleFilterChange(e.target.value as GameType | '')}
            className="px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {GAME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lottery Grid */}
      {lotteryTypes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border">
          <p className="text-4xl mb-4">🎫</p>
          <p className="text-muted-foreground">暂无可用的彩票类型</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {total} 种彩票，第 {currentPage} / {totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
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
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${
        isAvailable
          ? 'cursor-pointer hover:shadow-md hover:border-primary/50 hover:-translate-y-1'
          : 'opacity-75 cursor-not-allowed'
      }`}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        {lottery.cover_image ? (
          <img
            src={lottery.cover_image}
            alt={lottery.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
        
        {/* Status Badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lottery.status)}`}>
          {isSoldOut ? '已售罄' : getStatusLabel(lottery.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{lottery.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-3">
          {lottery.description}
        </p>

        {/* Info Row */}
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">
            {getGameTypeLabel(lottery.game_type)}
          </span>
          <span className="text-muted-foreground">
            库存: {lottery.stock > 0 ? lottery.stock : '无'}
          </span>
        </div>

        {/* Price and Max Prize */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">票价</span>
            <p className="font-bold text-primary">{formatPrice(lottery.price)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">最高奖金</span>
            <p className="font-bold text-yellow-600">{formatPrize(lottery.max_prize)}</p>
          </div>
        </div>

        {/* Buy Button */}
        <button
          disabled={!isAvailable}
          className={`w-full mt-4 py-2 rounded-lg font-medium transition-colors ${
            isAvailable
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {isSoldOut ? '已售罄' : '立即购买'}
        </button>
      </div>
    </div>
  );
}
