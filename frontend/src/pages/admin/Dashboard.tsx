import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, type DashboardStats } from '../../api/admin';

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
          onClick={fetchStats}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const netProfit = stats.total_revenue - stats.total_prizes_paid;
  const returnRate = stats.total_revenue > 0 
    ? ((stats.total_prizes_paid / stats.total_revenue) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">👥 用户统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon="👤"
            label="总用户数"
            value={stats.total_users}
            bgColor="bg-blue-50"
          />
          <StatCard
            icon="📅"
            label="今日新增"
            value={stats.new_users_today}
            bgColor="bg-green-50"
          />
          <StatCard
            icon="📆"
            label="本周新增"
            value={stats.new_users_week}
            bgColor="bg-yellow-50"
          />
          <StatCard
            icon="📊"
            label="本月新增"
            value={stats.new_users_month}
            bgColor="bg-purple-50"
          />
        </div>
      </div>

      {/* Sales Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">🎰 销售统计</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon="🎫"
            label="彩票销量"
            value={stats.total_tickets_sold}
            suffix="张"
            bgColor="bg-orange-50"
          />
          <StatCard
            icon="💰"
            label="销售总额"
            value={stats.total_revenue}
            suffix="积分"
            bgColor="bg-green-50"
          />
          <StatCard
            icon="🎉"
            label="派奖总额"
            value={stats.total_prizes_paid}
            suffix="积分"
            bgColor="bg-red-50"
          />
          <StatCard
            icon="📈"
            label="返奖率"
            value={returnRate}
            suffix="%"
            bgColor="bg-blue-50"
          />
        </div>
      </div>

      {/* Inventory & Exchange Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">📦 库存与兑换</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon="🎱"
            label="活跃奖组"
            value={stats.active_prize_pools}
            suffix="个"
            bgColor="bg-indigo-50"
          />
          <StatCard
            icon="📦"
            label="可售库存"
            value={stats.available_stock}
            suffix="张"
            bgColor="bg-cyan-50"
          />
          <StatCard
            icon="🛒"
            label="兑换次数"
            value={stats.total_exchanges}
            suffix="次"
            bgColor="bg-pink-50"
          />
          <StatCard
            icon="💵"
            label="净收益"
            value={netProfit}
            suffix="积分"
            bgColor={netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
            valueColor={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">⚡ 快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <QuickAction
            icon="📈"
            label="数据统计"
            href="/admin/statistics"
          />
          <QuickAction
            icon="🎰"
            label="新建彩票类型"
            href="/admin/lottery?action=create"
          />
          <QuickAction
            icon="🛒"
            label="新建商品"
            href="/admin/products?action=create"
          />
          <QuickAction
            icon="👥"
            label="用户管理"
            href="/admin/users"
          />
          <QuickAction
            icon="⚙️"
            label="系统设置"
            href="/admin/settings"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
  bgColor?: string;
  valueColor?: string;
}

function StatCard({ icon, label, value, suffix, bgColor = 'bg-muted', valueColor = 'text-foreground' }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  href: string;
}

function QuickAction({ icon, label, href }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:bg-muted transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}
