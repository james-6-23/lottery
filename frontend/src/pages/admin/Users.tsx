import { useState, useEffect, useCallback } from 'react';
import {
  getUsers,
  adjustUserPoints,
  updateUserRole,
  type AdminUser,
  type UserListQuery,
} from '../../api/admin';

const ROLE_OPTIONS = [
  { value: '', label: '全部角色' },
  { value: 'user', label: '普通用户' },
  { value: 'admin', label: '管理员' },
];

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Modal states
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Form states
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDescription, setPointsDescription] = useState('');
  const [newRole, setNewRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (query: UserListQuery) => {
    try {
      setLoading(true);
      const data = await getUsers(query);
      setUsers(data.users || []);
      setPage(data.page);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers({ page: 1, limit: 20 });
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers({ page: 1, limit: 20, search, role: roleFilter || undefined });
  };

  const handlePageChange = (newPage: number) => {
    fetchUsers({ page: newPage, limit: 20, search, role: roleFilter || undefined });
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || pointsAmount === 0) return;
    try {
      setSubmitting(true);
      await adjustUserPoints(selectedUser.id, {
        amount: pointsAmount,
        description: pointsDescription || undefined,
      });
      setShowPointsModal(false);
      resetPointsForm();
      fetchUsers({ page, limit: 20, search, role: roleFilter || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整积分失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      setSubmitting(true);
      await updateUserRole(selectedUser.id, newRole);
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      fetchUsers({ page, limit: 20, search, role: roleFilter || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新角色失败');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPointsForm = () => {
    setSelectedUser(null);
    setPointsAmount(0);
    setPointsDescription('');
  };

  const openPointsModal = (user: AdminUser) => {
    setSelectedUser(user);
    setPointsAmount(0);
    setPointsDescription('');
    setShowPointsModal(true);
  };

  const openRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="搜索用户名或 Linux.do ID..."
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            搜索
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {/* Users Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">用户</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Linux.do ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium">角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium">积分余额</th>
              <th className="px-4 py-3 text-left text-sm font-medium">注册时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm">{user.role === 'admin' ? '👑' : '👤'}</span>
                        </div>
                      )}
                      <span className="font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.linuxdo_id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-primary">{user.balance}</span>
                    <span className="text-sm text-muted-foreground ml-1">积分</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPointsModal(user)}
                        className="text-sm text-primary hover:underline"
                      >
                        调整积分
                      </button>
                      <button
                        onClick={() => openRoleModal(user)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        修改角色
                      </button>
                    </div>
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
            共 {total} 个用户，第 {page} / {totalPages} 页
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

      {/* Adjust Points Modal */}
      {showPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">调整积分</h2>
            
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">👤</div>
                )}
                <div>
                  <p className="font-medium">{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">当前余额: {selectedUser.balance} 积分</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">调整数量</label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="正数增加，负数扣除"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  调整后余额: {selectedUser.balance + pointsAmount} 积分
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">备注（可选）</label>
                <input
                  type="text"
                  value={pointsDescription}
                  onChange={(e) => setPointsDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="调整原因..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPointsModal(false); resetPointsForm(); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={submitting || pointsAmount === 0 || (selectedUser.balance + pointsAmount) < 0}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold mb-4">修改角色</h2>
            
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">👤</div>
                )}
                <div>
                  <p className="font-medium">{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">
                    当前角色: {selectedUser.role === 'admin' ? '管理员' : '普通用户'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">选择新角色</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="role"
                    value="user"
                    checked={newRole === 'user'}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">普通用户</p>
                    <p className="text-sm text-muted-foreground">只能访问前台功能</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={newRole === 'admin'}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">管理员</p>
                    <p className="text-sm text-muted-foreground">可以访问管理后台</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowRoleModal(false); setSelectedUser(null); setNewRole(''); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={submitting || newRole === selectedUser.role}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
