import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getPaymentStatus,
  createRechargeOrder,
  getPaymentOrders,
  getOrderStatus,
  getOrderStatusLabel,
  getOrderStatusColor,
  RECHARGE_AMOUNTS,
  type PaymentOrder,
  type PaymentStatus,
} from '../api/payment';
import { getBalance } from '../api/wallet';

export function Recharge() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  
  // Check for order_no in URL (return from payment)
  const orderNo = searchParams.get('order_no');
  const [checkingOrder, setCheckingOrder] = useState(!!orderNo);
  const [orderResult, setOrderResult] = useState<PaymentOrder | null>(null);

  // Fetch payment status and balance
  const fetchData = useCallback(async () => {
    try {
      const [statusData, balanceData] = await Promise.all([
        getPaymentStatus(),
        getBalance(),
      ]);
      setPaymentStatus(statusData);
      setBalance(balanceData.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check order status if returning from payment
  const checkOrderStatus = useCallback(async (orderNo: string) => {
    try {
      const order = await getOrderStatus(orderNo);
      setOrderResult(order);
      // Refresh balance if paid
      if (order.status === 'paid') {
        const balanceData = await getBalance();
        setBalance(balanceData.balance);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询订单失败');
    } finally {
      setCheckingOrder(false);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const data = await getPaymentOrders(1, 10);
      setOrders(data.orders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchData();
    
    if (orderNo) {
      checkOrderStatus(orderNo);
    }
  }, [isAuthenticated, authLoading, navigate, fetchData, orderNo, checkOrderStatus]);

  // Handle amount selection
  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError(null);
  };

  // Handle custom amount change
  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setError(null);
  };

  // Get final amount
  const getFinalAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    const custom = parseInt(customAmount, 10);
    return isNaN(custom) ? 0 : custom;
  };

  // Handle recharge submit
  const handleSubmit = async () => {
    const amount = getFinalAmount();
    
    if (amount < 1) {
      setError('请选择或输入充值金额');
      return;
    }
    
    if (amount > 10000) {
      setError('单次充值金额不能超过10000元');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createRechargeOrder(amount);
      // Redirect to payment URL
      window.location.href = result.payment_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败');
      setSubmitting(false);
    }
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

  // Close order result modal
  const closeOrderResult = () => {
    setOrderResult(null);
    // Remove order_no from URL
    navigate('/recharge', { replace: true });
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

  // Payment disabled
  if (!paymentStatus?.payment_enabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">积分充值</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">充值功能暂未开放</h2>
          <p className="text-yellow-700">
            充值功能正在维护中，请稍后再试。您可以通过参与活动获取积分。
          </p>
          <button
            onClick={() => navigate('/wallet')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            返回钱包
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">积分充值</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">当前余额</p>
            <p className="text-3xl font-bold text-primary">
              {balance}
              <span className="text-base ml-1">积分</span>
            </p>
          </div>
          <div className="text-5xl">💰</div>
        </div>
      </div>

      {/* Recharge Form */}
      <div className="bg-card rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">选择充值金额</h2>
        
        {/* Preset amounts */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {RECHARGE_AMOUNTS.map((item) => (
            <button
              key={item.amount}
              onClick={() => handleAmountSelect(item.amount)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedAmount === item.amount
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-lg font-bold">{item.label}</div>
              <div className="text-sm text-muted-foreground">
                获得 {item.points} 积分
              </div>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">自定义金额</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder="输入金额 (1-10000)"
              min="1"
              max="10000"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-muted-foreground">元</span>
          </div>
          {customAmount && parseInt(customAmount, 10) > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              将获得 {parseInt(customAmount, 10) * 10} 积分
            </p>
          )}
        </div>

        {/* Exchange rate info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-muted-foreground">
            💡 充值比例：1元 = 10积分
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || getFinalAmount() < 1}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '处理中...' : `立即充值 ${getFinalAmount() > 0 ? `¥${getFinalAmount()}` : ''}`}
        </button>
      </div>

      {/* Order History Toggle */}
      <div className="bg-card rounded-xl border shadow-sm">
        <button
          onClick={() => {
            setShowOrders(!showOrders);
            if (!showOrders && orders.length === 0) {
              fetchOrders();
            }
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <span className="font-semibold">充值记录</span>
          <span className="text-muted-foreground">{showOrders ? '▲' : '▼'}</span>
        </button>
        
        {showOrders && (
          <div className="border-t">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                暂无充值记录
              </div>
            ) : (
              <div className="divide-y">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">充值 ¥{order.amount}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </p>
                      {order.status === 'paid' && (
                        <p className="text-sm text-green-600">+{order.points} 积分</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Result Modal */}
      {(checkingOrder || orderResult) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            {checkingOrder ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">正在查询订单状态...</p>
              </div>
            ) : orderResult && (
              <div className="text-center">
                <div className="text-5xl mb-4">
                  {orderResult.status === 'paid' ? '✅' : orderResult.status === 'pending' ? '⏳' : '❌'}
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {orderResult.status === 'paid' ? '充值成功' : 
                   orderResult.status === 'pending' ? '等待支付' : '支付失败'}
                </h3>
                {orderResult.status === 'paid' && (
                  <p className="text-green-600 mb-4">
                    已获得 {orderResult.points} 积分
                  </p>
                )}
                {orderResult.status === 'pending' && (
                  <p className="text-muted-foreground mb-4">
                    订单尚未支付，请完成支付
                  </p>
                )}
                <button
                  onClick={closeOrderResult}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  确定
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
