import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScratchCard } from '../components/ScratchCard';
import { PatternScratchCard, type PatternScratchResult } from '../components/PatternScratchCard';
import {
  getTicketDetail,
  scratchTicket,
  formatPrize,
  type TicketDetail,
  type ScratchResponse,
  type PatternConfig,
  type PatternAreaData,
  type PatternGameData,
} from '../api/lottery';
import { useAuth } from '../hooks/useAuth';

export function Scratch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, refreshBalance } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scratch state
  const [scratching, setScratching] = useState(false);
  const [scratchResult, setScratchResult] = useState<ScratchResponse | null>(null);
  const [scratchError, setScratchError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [, setScratchProgress] = useState(0);

  // Pattern lottery state
  const [patternPrize, setPatternPrize] = useState(0);

  // Fetch ticket details
  const fetchTicketDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getTicketDetail(parseInt(id));
      setTicket(data);
      
      // If already scratched, show result immediately
      if (data.status !== 'unscratched') {
        setIsRevealed(true);
        setScratchResult({
          ticket_id: data.id,
          security_code: data.security_code,
          status: data.status,
          prize_amount: data.prize_amount || 0,
          is_win: (data.prize_amount || 0) > 0,
          content: data.content,
          new_balance: 0, // Will be updated from actual scratch
          scratched_at: data.scratched_at,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取彩票详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchTicketDetails();
  }, [fetchTicketDetails, isAuthenticated, navigate]);

  // Check if this is a pattern-type lottery
  const isPatternType = ticket?.lottery_type?.game_type === 'pattern';

  // Get pattern data from ticket content
  const getPatternData = useCallback((): { areas: PatternAreaData[]; config: PatternConfig; totalPoints: number } | null => {
    if (!ticket?.content?.game_data) return null;
    
    const gameData = ticket.content.game_data as PatternGameData;
    const patternContent = gameData?.pattern_content;
    
    if (!patternContent) return null;

    // Get config from lottery type rules_config
    let config: PatternConfig | null = null;
    if (ticket.lottery_type && typeof ticket.lottery_type === 'object') {
      const rulesConfig = (ticket.lottery_type as { rules_config?: PatternConfig }).rules_config;
      if (rulesConfig) {
        config = rulesConfig;
      }
    }

    // Default config if not available
    if (!config) {
      config = {
        area_count: patternContent.areas.length,
        patterns: [
          { id: 'A', name: '苹果', image_url: '', prize_points: 10, is_special: false },
          { id: 'B', name: '橙子', image_url: '', prize_points: 20, is_special: false },
          { id: 'C', name: '柠檬', image_url: '', prize_points: 30, is_special: false },
        ],
        special_patterns: [
          { id: 'SPECIAL_A', name: '星星', image_url: '', prize_points: 0, is_special: true },
        ],
        default_points: [1, 2, 3, 5, 10, 20, 50, 100],
      };
    }

    return {
      areas: patternContent.areas,
      config,
      totalPoints: patternContent.total_points,
    };
  }, [ticket]);

  // Handle standard scratch reveal
  const handleReveal = async () => {
    if (!ticket || scratching || scratchResult) return;

    setScratching(true);
    setScratchError(null);

    try {
      const result = await scratchTicket(ticket.id);
      setScratchResult(result);
      setIsRevealed(true);
      // 同步更新全局用户余额
      if (result.new_balance !== undefined) {
        refreshBalance(result.new_balance);
      }
    } catch (err) {
      setScratchError(err instanceof Error ? err.message : '刮奖失败');
    } finally {
      setScratching(false);
    }
  };

  // Handle pattern area scratched
  const handlePatternAreaScratched = (_areaIndex: number, result: PatternScratchResult) => {
    if (result.prizeAwarded > 0) {
      setPatternPrize(prev => prev + result.prizeAwarded);
    }
  };

  // Handle all pattern areas scratched
  const handleAllPatternScratched = async (totalPrize: number) => {
    if (!ticket || scratching || scratchResult) return;

    setScratching(true);
    setScratchError(null);

    try {
      const result = await scratchTicket(ticket.id);
      setScratchResult(result);
      setIsRevealed(true);
      setPatternPrize(totalPrize);
      // 同步更新全局用户余额
      if (result.new_balance !== undefined) {
        refreshBalance(result.new_balance);
      }
    } catch (err) {
      setScratchError(err instanceof Error ? err.message : '刮奖失败');
    } finally {
      setScratching(false);
    }
  };

  // Handle scratch progress
  const handleScratchProgress = (percentage: number) => {
    setScratchProgress(percentage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || '彩票不存在'}</p>
        <button
          onClick={() => navigate('/lottery')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          返回彩票大厅
        </button>
      </div>
    );
  }

  const isWin = scratchResult?.is_win || (ticket.prize_amount && ticket.prize_amount > 0);
  const prizeAmount = scratchResult?.prize_amount || ticket.prize_amount || patternPrize || 0;
  const patternData = isPatternType ? getPatternData() : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/lottery')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <span>←</span>
        <span>返回彩票大厅</span>
      </button>

      {/* Ticket Info */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.lottery_type?.name || '刮刮乐'}</h1>
            {isPatternType && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mt-1 inline-block">
                图案型
              </span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            ticket.status === 'unscratched' 
              ? 'bg-blue-50 text-blue-600' 
              : 'bg-green-50 text-green-600'
          }`}>
            {ticket.status === 'unscratched' ? '未刮开' : '已刮开'}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          保安码: <span className="font-mono">{ticket.security_code}</span>
        </div>
      </div>

      {/* Scratch Card Area */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex justify-center">
          <div className="relative">
            {/* Pattern Scratch Card */}
            {isPatternType && patternData ? (
              <PatternScratchCard
                areas={patternData.areas}
                config={patternData.config}
                totalPoints={patternData.totalPoints}
                onAreaScratched={handlePatternAreaScratched}
                onAllScratched={handleAllPatternScratched}
                disabled={ticket.status !== 'unscratched' || scratching}
                revealed={isRevealed || ticket.status !== 'unscratched'}
              />
            ) : (
              /* Standard Scratch Card */
              <ScratchCard
                width={320}
                height={200}
                coverColor="#c0c0c0"
                brushSize={40}
                revealThreshold={70}
                onReveal={handleReveal}
                onScratchProgress={handleScratchProgress}
                disabled={ticket.status !== 'unscratched' || scratching}
              >
                {/* Content to reveal */}
                <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${
                  isWin ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : 'bg-gradient-to-br from-gray-100 to-gray-200'
                }`}>
                  {isRevealed || ticket.status !== 'unscratched' ? (
                    <>
                      {isWin ? (
                        <>
                          <div className="text-5xl mb-2">🎉</div>
                          <div className="text-2xl font-bold text-yellow-600 mb-1">恭喜中奖！</div>
                          <div className="text-3xl font-bold text-primary">
                            +{formatPrize(prizeAmount)} 积分
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl mb-2">😢</div>
                          <div className="text-xl font-medium text-gray-600">未中奖</div>
                          <div className="text-sm text-muted-foreground mt-1">再接再厉！</div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground">刮开查看结果</div>
                  )}
                </div>
              </ScratchCard>
            )}

            {/* Scratching indicator */}
            {scratching && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>正在开奖...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {ticket.status === 'unscratched' && !isRevealed && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            {isPatternType 
              ? '刮开每个区域查看图案，刮出特殊图案可获得所有区域积分总和！'
              : '用鼠标或手指刮开灰色区域，刮开超过70%自动显示结果'
            }
          </div>
        )}

        {/* Scratch Error */}
        {scratchError && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
            {scratchError}
          </div>
        )}
      </div>

      {/* Result Details */}
      {(isRevealed || ticket.status !== 'unscratched') && (
        <div className="bg-card rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">开奖结果</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">彩票类型</span>
              <span className="font-medium">{ticket.lottery_type?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">保安码</span>
              <span className="font-mono">{ticket.security_code}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">中奖状态</span>
              <span className={`font-medium ${isWin ? 'text-yellow-600' : 'text-gray-500'}`}>
                {isWin ? '中奖' : '未中奖'}
              </span>
            </div>
            {isWin && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">中奖金额</span>
                <span className="font-bold text-primary text-lg">+{formatPrize(prizeAmount)} 积分</span>
              </div>
            )}
            {scratchResult && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">当前余额</span>
                <span className="font-medium">{scratchResult.new_balance} 积分</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">购买时间</span>
              <span>{new Date(ticket.purchased_at).toLocaleString()}</span>
            </div>
            {(scratchResult?.scratched_at || ticket.scratched_at) && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">刮奖时间</span>
                <span>{new Date(scratchResult?.scratched_at || ticket.scratched_at!).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/lottery')}
          className="flex-1 py-3 border rounded-lg hover:bg-muted font-medium"
        >
          继续购买
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
        >
          查看记录
        </button>
      </div>
    </div>
  );
}
