import { useState, useEffect, useCallback } from 'react';
import {
  getAdminLogs,
  getActionLabel,
  getTargetTypeLabel,
  type AdminLog,
  type AdminLogQuery,
} from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Filter, FileText, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'adjust_points', label: '调整积分' },
  { value: 'update_role', label: '更新角色' },
  { value: 'update_settings', label: '更新设置' },
  { value: 'create_lottery_type', label: '创建彩票类型' },
  { value: 'update_lottery_type', label: '更新彩票类型' },
  { value: 'delete_lottery_type', label: '删除彩票类型' },
  { value: 'create_product', label: '创建商品' },
  { value: 'update_product', label: '更新商品' },
  { value: 'delete_product', label: '删除商品' },
  { value: 'import_card_keys', label: '导入卡密' },
];

const TARGET_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'user', label: '用户' },
  { value: 'system', label: '系统' },
  { value: 'lottery_type', label: '彩票类型' },
  { value: 'product', label: '商品' },
];

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filter states
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  
  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  const fetchLogs = useCallback(async (query: AdminLogQuery) => {
    try {
      setLoading(true);
      const data = await getAdminLogs(query);
      setLogs(data.logs || []);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取日志失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs({ page: 1, limit: 20 });
  }, [fetchLogs]);

  const handleFilter = () => {
    fetchLogs({
      page: 1,
      limit: 20,
      action: actionFilter || undefined,
      target_type: targetTypeFilter || undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    fetchLogs({
      page: newPage,
      limit: 20,
      action: actionFilter || undefined,
      target_type: targetTypeFilter || undefined,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create')) return 'default'; // Map to default (primary) or specific green style via className
    if (action.includes('update') || action.includes('adjust')) return 'secondary';
    return 'outline';
  };

  const getActionClassName = (action: string) => {
     if (action.includes('create')) return 'bg-green-600 hover:bg-green-700';
     if (action.includes('update') || action.includes('adjust')) return 'bg-blue-600 text-white hover:bg-blue-700';
     return '';
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {TARGET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleFilter} className="w-full sm:w-auto">
          筛选
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">时间</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">操作者</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">操作</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">目标类型</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">目标ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">详情</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    暂无操作日志
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle text-muted-foreground">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-4 align-middle font-medium">
                      {log.admin_name || `管理员 #${log.admin_id}`}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant={getActionColor(log.action)}
                        className={cn(getActionClassName(log.action))}
                      >
                        {getActionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      {getTargetTypeLabel(log.target_type)}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground font-mono">
                      {log.target_id || '-'}
                    </td>
                    <td className="p-4 align-middle">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4 mr-1" /> 查看
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              共 {total} 条日志
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>操作详情</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">时间</span>
                  <span>{formatDate(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">操作者</span>
                  <span>{selectedLog.admin_name || `管理员 #${selectedLog.admin_id}`}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">操作</span>
                  <Badge
                    variant={getActionColor(selectedLog.action)}
                    className={cn(getActionClassName(selectedLog.action))}
                  >
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">目标</span>
                  <span>{getTargetTypeLabel(selectedLog.target_type)} #{selectedLog.target_id || '-'}</span>
                </div>
              </div>
              
              {selectedLog.details && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 详细信息
                  </p>
                  <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedLog(null)}>
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
