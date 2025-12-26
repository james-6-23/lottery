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
import { Search, RotateCcw, ShieldCheck, Ticket, Calendar, Trophy, AlertCircle, Info, Sparkles } from 'lucide-react';
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
    <div className="max-w-xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/5 text-primary mb-2">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">保安码验证</h1>
        <p className="text-muted-foreground text-lg">
          输入彩票上的16位保安码，查询彩票真伪和中奖状态
        </p>
      </div>

      {/* Search Form */}
      <Card className="glass-card border-primary/20 shadow-lg">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="securityCode" className="text-sm font-medium text-muted-foreground ml-1">
                请输入保安码
              </label>
              <div className="relative group">
                <Input
                  type="text"
                  id="securityCode"
                  value={securityCode}
                  onChange={handleInputChange}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono text-xl tracking-widest uppercase h-14 pl-12 bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20 transition-all text-center group-hover:border-primary/40"
                  maxLength={16}
                  autoComplete="off"
                  disabled={loading}
                />
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground text-right font-mono">
                {securityCode.length}/16
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-destructive/5 text-destructive rounded-xl text-sm border border-destructive/20 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                disabled={loading || securityCode.length !== 16}
                className="flex-1 h-12 text-base font-semibold shadow-lg shadow-primary/20"
                size="lg"
              >
                {loading ? (
                   <>查询中...</>
                ) : (
                   <>
                     <Search className="w-5 h-5 mr-2" /> 立即验证
                   </>
                )}
              </Button>
              {(result || error) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-12 w-12 p-0 rounded-xl"
                  title="重置"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="overflow-hidden animate-in slide-in-from-bottom-8 duration-700 glass-card border-primary/20 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/40 pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                验证结果
              </CardTitle>
              <Badge 
                className={cn(
                  "px-4 py-1.5 text-sm font-bold uppercase shadow-sm border-0",
                  result.status === 'claimed' && "bg-emerald-500 hover:bg-emerald-600",
                  result.status === 'scratched' && "bg-amber-500 hover:bg-amber-600",
                  result.status === 'unscratched' && "bg-blue-500 hover:bg-blue-600"
                )}
              >
                {getTicketStatusLabel(result.status)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            <div className="grid gap-8">
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <span className="text-sm text-muted-foreground mb-2">验证保安码</span>
                <span className="font-mono font-bold tracking-[0.2em] text-2xl text-primary">{result.security_code}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> 彩票类型
                  </span>
                  <p className="font-medium text-lg">{result.lottery_type}</p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 购买时间
                  </span>
                  <p className="font-medium text-lg">{formatDate(result.purchase_time)}</p>
                </div>

                {/* Prize Info - Only shown for scratched tickets */}
                {result.status !== 'unscratched' && (
                  <>
                    <div className="space-y-1 md:col-span-2 border-t border-border/40 pt-6 mt-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                         <Calendar className="w-4 h-4" /> 刮开时间
                      </span>
                      <p className="font-medium text-lg">{result.scratched_at ? formatDate(result.scratched_at) : '-'}</p>
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 bg-gradient-to-br from-background to-secondary/20 p-6 rounded-2xl border border-border/50">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> 中奖金额
                      </span>
                      <p className={cn(
                        "text-4xl font-black tracking-tight",
                         result.prize_amount && result.prize_amount > 0 ? "text-emerald-500" : "text-muted-foreground"
                      )}>
                        {result.prize_amount !== undefined 
                          ? (result.prize_amount > 0 ? `+${result.prize_amount}` : '未中奖')
                          : '-'
                        }
                        {(result.prize_amount ?? 0) > 0 && <span className="text-lg font-medium text-muted-foreground ml-2">积分</span>}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Unscratched Notice */}
            {result.status === 'unscratched' && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-700 dark:text-blue-400 text-sm flex gap-3 items-start">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">该彩票尚未刮开，出于安全考虑，系统不会透露中奖信息。请您刮开彩票后再来验证。</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <div className="bg-muted/30 rounded-2xl p-6 text-sm text-muted-foreground space-y-3 border border-border/40">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4" /> 使用说明
        </h3>
        <ul className="space-y-2 list-disc pl-5 opacity-80">
          <li>保安码位于彩票正面，由16位字母和数字组成。</li>
          <li>每张彩票的保安码都是唯一的，可用于验证彩票真伪。</li>
          <li>未刮开的彩票系统会显示"未刮开"状态，不透露中奖信息。</li>
          <li>如有疑问，请联系客服获取帮助。</li>
        </ul>
      </div>
    </div>
  );
}
