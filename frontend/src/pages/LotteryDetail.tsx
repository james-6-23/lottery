import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLotteryTypeById,
  purchaseTickets,
  getGameTypeLabel,
  formatPrice,
  formatPrize,
  type LotteryTypeDetail,
  type PurchaseResponse,
} from '../api/lottery';
import { getWallet, type WalletResponse } from '../api/wallet';
import { useAuth } from '../hooks/useAuth';

export function LotteryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, refreshBalance } = useAuth();

  const [lottery, setLottery] = useState<LotteryTypeDetail | null>(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Purchase state
  const [quantity, setQuantity] = useState(1);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Fetch lottery details
  const fetchLotteryDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getLotteryTypeById(parseInt(id));
      setLottery(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取彩票详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch wallet info
  const fetchWallet = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLotteryDetails();
  }, [fetchLotteryDetails]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Calculate total cost
  const totalCost = lottery ? lottery.price * quantity : 0;
  const canPurchase = wallet && wallet.balance >= totalCost && lottery?.status === 'available' && lottery.stock >= quantity;
  const insufficientBalance = wallet && wallet.balance < totalCost;

  // Handle purchase
  const handlePurchase = async () => {
    if (!lottery || !canPurchase) return;

    setPurchasing(true);
    setPurchaseError(null);

    try {
      const result = await purchaseTickets({
        lottery_type_id: lottery.id,
        quantity,
      });
      setPurchaseResult(result);
      setShowPurchaseDialog(false);
      // Refresh wallet and sync global balance
      fetchWallet();
      refreshBalance(result.balance);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : '购买失败');
    } finally {
      setPurchasing(false);
    }
  };

  // Handle go to scratch
  const handleGoToScratch = () => {
    if (purchaseResult && purchaseResult.tickets.length > 0) {
      // Navigate to scratch page with first ticket
      navigate(`/scratch/${purchaseResult.tickets[0].id}`);
    }
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

  if (error || !lottery) {
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/lottery')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <span>←</span>
        <span>返回彩票大厅</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Lottery Image */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="h-64 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            {lottery.cover_image ? (
              <img
                src={lottery.cover_image}
                alt={lottery.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">🎫</span>
            )}
          </div>
        </div>

        {/* Right: Lottery Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{lottery.name}</h1>
          <p className="text-muted-foreground mb-4">{lottery.description}</p>

          <div className="space-y-4">
            {/* Game Type */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">游戏类型</span>
              <span className="font-medium">{getGameTypeLabel(lottery.game_type)}</span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">票价</span>
              <span className="font-bold text-primary text-xl">{formatPrice(lottery.price)}</span>
            </div>

            {/* Max Prize */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">最高奖金</span>
              <span className="font-bold text-yellow-600 text-xl">{formatPrize(lottery.max_prize)} 积分</span>
            </div>

            {/* Stock */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">剩余库存</span>
              <span className={`font-medium ${lottery.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {lottery.stock > 0 ? `${lottery.stock} 张` : '已售罄'}
              </span>
            </div>

            {/* User Balance */}
            {isAuthenticated && wallet && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">我的余额</span>
                <span className="font-medium">{wallet.balance} 积分</span>
              </div>
            )}
          </div>

          {/* Purchase Section */}
          {isAuthenticated ? (
            <div className="mt-6 space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">购买数量</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10 || quantity >= lottery.stock}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-muted-foreground">
                  共 <span className="font-bold text-primary">{totalCost}</span> 积分
                </span>
              </div>

              {/* Insufficient Balance Warning */}
              {insufficientBalance && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  余额不足，还需 {totalCost - (wallet?.balance || 0)} 积分
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={() => setShowPurchaseDialog(true)}
                disabled={!canPurchase}
                className={`w-full py-3 rounded-lg font-medium text-lg transition-colors ${
                  canPurchase
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {lottery.stock === 0 ? '已售罄' : insufficientBalance ? '余额不足' : '立即购买'}
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-lg font-medium text-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                登录后购买
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Prize Levels */}
      {lottery.prize_levels && lottery.prize_levels.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">奖级设置</h2>
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">奖级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">名称</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">奖金</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">剩余</th>
                </tr>
              </thead>
              <tbody>
                {lottery.prize_levels.map((level) => (
                  <tr key={level.id} className="border-t">
                    <td className="px-4 py-3 text-sm">{level.level}等奖</td>
                    <td className="px-4 py-3 text-sm">{level.name}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-yellow-600">
                      {formatPrize(level.prize_amount)} 积分
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {level.remaining} / {level.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchase Confirmation Dialog */}
      {showPurchaseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4">确认购买</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">彩票类型</span>
                <span className="font-medium">{lottery.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">购买数量</span>
                <span className="font-medium">{quantity} 张</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">单价</span>
                <span className="font-medium">{lottery.price} 积分</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-medium">总计</span>
                <span className="font-bold text-primary text-lg">{totalCost} 积分</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">购买后余额</span>
                <span>{(wallet?.balance || 0) - totalCost} 积分</span>
              </div>
            </div>

            {purchaseError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
                {purchaseError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseDialog(false)}
                disabled={purchasing}
                className="flex-1 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {purchasing ? '购买中...' : '确认购买'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Success Dialog */}
      {purchaseResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">购买成功！</h3>
            <p className="text-muted-foreground mb-4">
              您已成功购买 {purchaseResult.tickets.length} 张彩票
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">消费积分</span>
                <span className="font-medium">{purchaseResult.cost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">剩余余额</span>
                <span className="font-medium">{purchaseResult.balance}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPurchaseResult(null);
                  navigate('/lottery');
                }}
                className="flex-1 py-2 border rounded-lg hover:bg-muted"
              >
                继续购买
              </button>
              <button
                onClick={handleGoToScratch}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                去刮奖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
