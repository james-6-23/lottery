import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, type DashboardStats } from '../../api/admin';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Calendar, ShoppingBag, Ticket, Coins, Gift, Percent, Package, Archive, RefreshCw, Settings, BarChart3, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchStats}>
          <RefreshCw className="w-4 h-4 mr-2" /> 重试
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const netProfit = stats.total_revenue - stats.total_prizes_paid;
  const returnRate = stats.total_revenue > 0 
    ? ((stats.total_prizes_paid / stats.total_revenue) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-8">
      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" /> 用户统计
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="总用户数"
            value={stats.total_users}
            className="bg-blue-50 dark:bg-blue-950/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={Calendar}
            label="今日新增"
            value={stats.new_users_today}
            className="bg-green-50 dark:bg-green-950/20"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={Calendar}
            label="本周新增"
            value={stats.new_users_week}
            className="bg-yellow-50 dark:bg-yellow-950/20"
            iconColor="text-yellow-600 dark:text-yellow-400"
          />
          <StatCard
            icon={Calendar}
            label="本月新增"
            value={stats.new_users_month}
            className="bg-purple-50 dark:bg-purple-950/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
        </div>
      </div>

      {/* Sales Statistics */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5" /> 销售统计
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Ticket}
            label="彩票销量"
            value={stats.total_tickets_sold}
            suffix="张"
            className="bg-orange-50 dark:bg-orange-950/20"
            iconColor="text-orange-600 dark:text-orange-400"
          />
          <StatCard
            icon={Coins}
            label="销售总额"
            value={stats.total_revenue}
            suffix="积分"
            className="bg-emerald-50 dark:bg-emerald-950/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={Gift}
            label="派奖总额"
            value={stats.total_prizes_paid}
            suffix="积分"
            className="bg-rose-50 dark:bg-rose-950/20"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <StatCard
            icon={Percent}
            label="返奖率"
            value={returnRate}
            suffix="%"
            className="bg-cyan-50 dark:bg-cyan-950/20"
            iconColor="text-cyan-600 dark:text-cyan-400"
          />
        </div>
      </div>

      {/* Inventory & Exchange Statistics */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> 库存与兑换
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Archive}
            label="活跃奖组"
            value={stats.active_prize_pools}
            suffix="个"
            className="bg-indigo-50 dark:bg-indigo-950/20"
            iconColor="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            icon={Package}
            label="可售库存"
            value={stats.available_stock}
            suffix="张"
            className="bg-sky-50 dark:bg-sky-950/20"
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <StatCard
            icon={ShoppingBag}
            label="兑换次数"
            value={stats.total_exchanges}
            suffix="次"
            className="bg-pink-50 dark:bg-pink-950/20"
            iconColor="text-pink-600 dark:text-pink-400"
          />
          <StatCard
            icon={Coins}
            label="净收益"
            value={netProfit}
            suffix="积分"
            className={netProfit >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}
            iconColor={netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
            valueColor={netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5" /> 快捷操作
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <QuickAction
            icon={BarChart3}
            label="数据统计"
            href="/admin/statistics"
          />
          <QuickAction
            icon={Ticket}
            label="新建彩票"
            href="/admin/lottery?action=create"
          />
          <QuickAction
            icon={ShoppingBag}
            label="新建商品"
            href="/admin/products?action=create"
          />
          <QuickAction
            icon={Users}
            label="用户管理"
            href="/admin/users"
          />
          <QuickAction
            icon={Settings}
            label="系统设置"
            href="/admin/settings"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  className?: string;
  iconColor?: string;
  valueColor?: string;
}

function StatCard({ icon: Icon, label, value, suffix, className, iconColor, valueColor }: StatCardProps) {
  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-full bg-background/60", iconColor)}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className={cn("text-2xl font-bold", valueColor)}>
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  href: string;
}

function QuickAction({ icon: Icon, label, href }: QuickActionProps) {
  return (
    <Link to={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
        <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center h-full">
          <Icon className="w-6 h-6 text-primary" />
          <span className="font-medium text-sm">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
