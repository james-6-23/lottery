import { useState, useEffect, useCallback } from 'react';
import {
  getAdminLogs,
  getActionLabel,
  getTargetTypeLabel,
  type AdminLog,
  type AdminLogQuery,
} from '../../api/admin';

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

  const getActionColor = (action: string) => {
    if (action.includes('delete')) return 'bg-red-100 text-red-700';
    if (action.includes('create')) return 'bg-green-100 text-green-700';
    if (action.includes('update') || action.includes('adjust')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {TARGET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          筛选
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* Logs Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作者</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
              <th className="px-4 py-3 text-left text-sm font-medium">目标类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium">目标ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium">详情</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  暂无操作日志
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {log.admin_name || `管理员 #${log.admin_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getTargetTypeLabel(log.target_type)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.target_id || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-sm text-primary hover:underline"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {total} 条日志，第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">操作详情</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">时间</span>
                <span>{formatDate(selectedLog.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">操作者</span>
                <span>{selectedLog.admin_name || `管理员 #${selectedLog.admin_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">操作</span>
                <span className={`text-xs px-2 py-1 rounded ${getActionColor(selectedLog.action)}`}>
                  {getActionLabel(selectedLog.action)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">目标</span>
                <span>{getTargetTypeLabel(selectedLog.target_type)} #{selectedLog.target_id || '-'}</span>
              </div>
              
              {selectedLog.details && (
                <div>
                  <p className="text-muted-foreground mb-2">详细信息</p>
                  <pre className="p-3 bg-muted rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full mt-6 px-4 py-2 border rounded-lg hover:bg-muted"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
