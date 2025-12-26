import { useState, useEffect, useCallback } from 'react';
import {
  getStatistics,
  exportStatisticsCSV,
  type StatisticsResponse,
  type StatisticsQuery,
} from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, RefreshCw, BarChart2, TrendingUp, Users } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AdminStatistics() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState<StatisticsQuery>({
    period: 'day',
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStatistics(query);
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportStatisticsCSV(query);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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

  const { core_metrics, user_trend, sales_trend, prizes_trend, lottery_type_stats, prize_distribution, user_behavior } = stats;

  // Prepare chart data
  const userTrendData = user_trend.labels.map((label, i) => ({
    date: label,
    users: user_trend.data[i] || 0,
  }));

  const salesTrendData = sales_trend.labels.map((label, i) => ({
    date: label,
    amount: sales_trend.data[i] || 0,
    count: sales_trend.data2?.[i] || 0,
  }));

  const prizesTrendData = prizes_trend.labels.map((label, i) => ({
    date: label,
    prizes: prizes_trend.data[i] || 0,
  }));

  const pieData = prize_distribution.map((item) => ({
    name: item.level,
    value: item.count,
    amount: item.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">数据统计</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">开始:</label>
              <input
                type="date"
                value={query.start_date || ''}
                onChange={(e) => setQuery({ ...query, start_date: e.target.value })}
                className="h-9 px-3 border rounded-md text-sm bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">结束:</label>
              <input
                type="date"
                value={query.end_date || ''}
                onChange={(e) => setQuery({ ...query, end_date: e.target.value })}
                className="h-9 px-3 border rounded-md text-sm bg-background"
              />
            </div>
            <select
              value={query.period}
              onChange={(e) => setQuery({ ...query, period: e.target.value as 'day' | 'week' | 'month' })}
              className="h-9 px-3 border rounded-md text-sm bg-background"
            >
              <option value="day">按天</option>
              <option value="week">按周</option>
              <option value="month">按月</option>
            </select>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" /> 导出CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Core Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> 核心指标
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard icon="👥" label="总用户数" value={core_metrics.total_users} className="bg-blue-50 dark:bg-blue-950/20" />
          <MetricCard icon="📅" label="今日新增" value={core_metrics.new_users_today} className="bg-green-50 dark:bg-green-950/20" />
          <MetricCard icon="💰" label="积分流入" value={core_metrics.total_points_inflow} suffix="积分" className="bg-emerald-50 dark:bg-emerald-950/20" />
          <MetricCard icon="💸" label="积分流出" value={core_metrics.total_points_outflow} suffix="积分" className="bg-rose-50 dark:bg-rose-950/20" />
          <MetricCard icon="🎫" label="彩票销量" value={core_metrics.total_tickets_sold} suffix="张" className="bg-orange-50 dark:bg-orange-950/20" />
          <MetricCard icon="💵" label="销售总额" value={core_metrics.total_sales_amount} suffix="积分" className="bg-purple-50 dark:bg-purple-950/20" />
          <MetricCard icon="🎉" label="派奖总额" value={core_metrics.total_prizes_paid} suffix="积分" className="bg-yellow-50 dark:bg-yellow-950/20" />
          <MetricCard icon="📉" label="返奖率" value={core_metrics.return_rate.toFixed(1)} suffix="%" className="bg-cyan-50 dark:bg-cyan-950/20" />
          <MetricCard icon="🛒" label="兑换消耗" value={core_metrics.total_exchange_cost} suffix="积分" className="bg-pink-50 dark:bg-pink-950/20" />
          <MetricCard 
            icon="💎" 
            label="净收益" 
            value={core_metrics.total_sales_amount - core_metrics.total_prizes_paid} 
            suffix="积分"
            highlight={core_metrics.total_sales_amount - core_metrics.total_prizes_paid >= 0}
            className={core_metrics.total_sales_amount - core_metrics.total_prizes_paid >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}
          />
        </div>
      </div>

      {/* User Behavior Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" /> 用户行为
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MetricCard icon="🔥" label="今日活跃" value={user_behavior.active_users_today} />
          <MetricCard icon="📅" label="本周活跃" value={user_behavior.active_users_week} />
          <MetricCard icon="📆" label="本月活跃" value={user_behavior.active_users_month} />
          <MetricCard icon="🎯" label="人均购彩" value={user_behavior.avg_purchase_count.toFixed(1)} suffix="次" />
          <MetricCard icon="💰" label="人均消费" value={user_behavior.avg_purchase_amount.toFixed(0)} suffix="积分" />
          <MetricCard icon="📊" label="7日留存" value={user_behavior.retention_rate_7d.toFixed(1)} suffix="%" />
          <MetricCard icon="📈" label="30日留存" value={user_behavior.retention_rate_30d.toFixed(1)} suffix="%" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-md">👥 用户增长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  name="新增用户" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-md">💰 销售趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="amount" name="销售额" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="count" name="销量" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prizes Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-md">🎉 派奖趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prizesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="prizes" 
                  name="派奖金额" 
                  stroke="#FF8042" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prize Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-md">🎯 奖金分布</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                暂无中奖数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lottery Type Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md">🎰 彩票类型统计</CardTitle>
        </CardHeader>
        <CardContent>
          {lottery_type_stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">彩票名称</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">销量</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">销售额</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">派奖金额</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">返奖率</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">净收益</th>
                  </tr>
                </thead>
                <tbody>
                  {lottery_type_stats.map((lt) => (
                    <tr key={lt.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{lt.name}</td>
                      <td className="text-right py-3 px-4">{lt.total_sold.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{lt.total_amount.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{lt.total_prizes.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{lt.return_rate.toFixed(1)}%</td>
                      <td className={`text-right py-3 px-4 font-medium ${lt.total_amount - lt.total_prizes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(lt.total_amount - lt.total_prizes).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无彩票类型数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lottery Type Bar Chart */}
      {lottery_type_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-md">📊 彩票类型销量对比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lottery_type_stats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="total_sold" name="销量" fill="#8884d8" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total_prizes" name="派奖" fill="#82ca9d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
  className?: string;
}

function MetricCard({ icon, label, value, suffix, highlight, className }: MetricCardProps) {
  return (
    <Card className={cn("border-none shadow-sm", className)}>
      <CardContent className="p-3 flex flex-col justify-between h-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{icon}</span>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className={cn(
          "text-lg font-bold",
          highlight === false ? 'text-red-600' : highlight === true ? 'text-green-600' : ''
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
