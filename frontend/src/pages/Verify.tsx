import { useState } from 'react';
import {
  verifySecurityCode,
  getTicketStatusLabel,
  getTicketStatusColor,
  type VerifyResponse,
} from '../api/lottery';
import { ApiError } from '../api/client';

export function Verify() {
  const [securityCode, setSecurityCode] = useState('');
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle input change - only allow alphanumeric and convert to uppercase
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 16) {
      setSecurityCode(value);
      setError(null);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (securityCode.length !== 16) {
      setError('保安码必须是16位字母数字组合');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await verifySecurityCode(securityCode);
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('查询失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear result and reset form
  const handleReset = () => {
    setSecurityCode('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">保安码验证</h1>
      <p className="text-muted-foreground mb-8">
        输入彩票上的16位保安码，查询彩票真伪和中奖状态
      </p>

      {/* Search Form */}
      <div className="bg-card rounded-xl border shadow-sm p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="securityCode" className="block text-sm font-medium mb-2">
              保安码
            </label>
            <input
              type="text"
              id="securityCode"
              value={securityCode}
              onChange={handleInputChange}
              placeholder="请输入16位保安码"
              className="w-full px-4 py-3 border rounded-lg text-lg tracking-widest font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
              maxLength={16}
              autoComplete="off"
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-2">
              已输入 {securityCode.length}/16 位
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || securityCode.length !== 16}
              className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  查询中...
                </span>
              ) : (
                '查询'
              )}
            </button>
            {(result || error) && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🎫</span>
              查询结果
            </h2>
          </div>
          
          <div className="p-6">
            {/* Status Badge */}
            <div className="flex items-center justify-center mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getTicketStatusColor(result.status)}`}>
                {getTicketStatusLabel(result.status)}
              </span>
            </div>

            {/* Ticket Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">保安码</span>
                <span className="font-mono font-medium tracking-wider">{result.security_code}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">彩票类型</span>
                <span className="font-medium">{result.lottery_type}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">购买时间</span>
                <span>{formatDate(result.purchase_time)}</span>
              </div>

              {/* Prize Info - Only shown for scratched tickets */}
              {result.status !== 'unscratched' && (
                <>
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">刮开时间</span>
                    <span>{result.scratched_at ? formatDate(result.scratched_at) : '-'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground">中奖金额</span>
                    <span className={`text-xl font-bold ${
                      result.prize_amount && result.prize_amount > 0 
                        ? 'text-green-600' 
                        : 'text-muted-foreground'
                    }`}>
                      {result.prize_amount !== undefined 
                        ? (result.prize_amount > 0 ? `${result.prize_amount} 积分` : '未中奖')
                        : '-'
                      }
                    </span>
                  </div>
                </>
              )}

              {/* Unscratched Notice */}
              {result.status === 'unscratched' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm flex items-center gap-2">
                    <span>ℹ️</span>
                    该彩票尚未刮开，中奖信息将在刮开后显示
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-medium mb-2">💡 使用说明</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 保安码位于彩票正面，由16位字母和数字组成</li>
          <li>• 每张彩票的保安码都是唯一的</li>
          <li>• 未刮开的彩票不会显示中奖信息</li>
          <li>• 如有疑问，请联系客服</li>
        </ul>
      </div>
    </div>
  );
}
