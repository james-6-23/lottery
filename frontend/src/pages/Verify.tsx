import { useState } from 'react';
import {
  verifySecurityCode,
  getTicketStatusLabel,
  type VerifyResponse,
} from '../api/lottery';
import { ApiError } from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, ShieldCheck, Ticket, Calendar, Trophy, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">保安码验证</h1>
        <p className="text-muted-foreground">
          输入彩票上的16位保安码，查询彩票真伪和中奖状态
        </p>
      </div>

      {/* Search Form */}
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="securityCode" className="text-sm font-medium">
                保安码
              </label>
              <div className="relative">
                <Input
                  type="text"
                  id="securityCode"
                  value={securityCode}
                  onChange={handleInputChange}
                  placeholder="请输入16位保安码"
                  className="font-mono text-lg tracking-widest uppercase h-12 pl-10"
                  maxLength={16}
                  autoComplete="off"
                  disabled={loading}
                />
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {securityCode.length}/16
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || securityCode.length !== 16}
                className="flex-1 h-12 text-base"
              >
                {loading ? (
                   <>查询中...</>
                ) : (
                   <>
                     <Search className="w-4 h-4 mr-2" /> 查询
                   </>
                )}
              </Button>
              {(result || error) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-12 w-24"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> 重置
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="bg-muted/50 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                查询结果
              </CardTitle>
              <Badge 
                className={cn(
                  "px-3 py-1 text-sm font-medium uppercase",
                  result.status === 'claimed' && "bg-green-600 hover:bg-green-600",
                  result.status === 'scratched' && "bg-yellow-600 hover:bg-yellow-600",
                  result.status === 'unscratched' && "bg-blue-600 hover:bg-blue-600"
                )}
              >
                {getTicketStatusLabel(result.status)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">保安码</span>
                <span className="font-mono font-medium tracking-wider text-lg">{result.security_code}</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> 彩票类型
                  </span>
                  <span className="font-medium">{result.lottery_type}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 购买时间
                  </span>
                  <span>{formatDate(result.purchase_time)}</span>
                </div>

                {/* Prize Info - Only shown for scratched tickets */}
                {result.status !== 'unscratched' && (
                  <>
                    <div className="flex justify-between items-center text-sm border-t pt-4">
                      <span className="text-muted-foreground flex items-center gap-2">
                         <Calendar className="w-4 h-4" /> 刮开时间
                      </span>
                      <span>{result.scratched_at ? formatDate(result.scratched_at) : '-'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> 中奖金额
                      </span>
                      <span className={cn(
                        "text-2xl font-bold",
                         result.prize_amount && result.prize_amount > 0 ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {result.prize_amount !== undefined 
                          ? (result.prize_amount > 0 ? `+${result.prize_amount}` : '未中奖')
                          : '-'
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Unscratched Notice */}
            {result.status === 'unscratched' && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm flex gap-3">
                <Info className="w-5 h-5 shrink-0" />
                <p>该彩票尚未刮开，中奖信息将在刮开后显示。请妥善保管。</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <div className="bg-muted/30 rounded-xl p-6 text-sm text-muted-foreground space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4" /> 使用说明
        </h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>保安码位于彩票正面，由16位字母和数字组成。</li>
          <li>每张彩票的保安码都是唯一的，可用于验证彩票真伪。</li>
          <li>未刮开的彩票系统会显示"未刮开"状态，不透露中奖信息。</li>
          <li>如有疑问，请联系客服获取帮助。</li>
        </ul>
      </div>
    </div>
  );
}