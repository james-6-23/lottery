import { useState, useEffect, useCallback } from 'react';
import {
  getUsers,
  adjustUserPoints,
  updateUserRole,
  type AdminUser,
  type UserListQuery,
} from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Coins, Shield, User, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
            placeholder="搜索用户名..."
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Button onClick={handleSearch} className="w-full sm:w-auto">
          搜索
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">用户</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">角色</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">积分余额</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">注册时间</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    暂无用户
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground font-mono text-xs">{user.id}</td>
                    <td className="p-4 align-middle">
                      <Badge variant={user.role === 'admin' ? "default" : "secondary"} className={cn(user.role === 'admin' && "bg-yellow-600 hover:bg-yellow-700")}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-bold text-primary">{user.balance}</span>
                      <span className="text-xs text-muted-foreground ml-1">积分</span>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openPointsModal(user)}>
                          <Coins className="w-4 h-4 mr-1" /> 积分
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openRoleModal(user)}>
                          <Shield className="w-4 h-4 mr-1" /> 角色
                        </Button>
                      </div>
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
              共 {total} 个用户
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

      {/* Adjust Points Modal */}
      {showPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>调整积分</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowPointsModal(false); resetPointsForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">当前余额: {selectedUser.balance} 积分</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">调整数量</label>
                <Input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                  placeholder="正数增加，负数扣除"
                />
                <p className="text-xs text-muted-foreground">
                  调整后余额: {selectedUser.balance + pointsAmount} 积分
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">备注（可选）</label>
                <Input
                  value={pointsDescription}
                  onChange={(e) => setPointsDescription(e.target.value)}
                  placeholder="调整原因..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowPointsModal(false); resetPointsForm(); }} disabled={submitting}>
                  取消
                </Button>
                <Button 
                  onClick={handleAdjustPoints} 
                  disabled={submitting || pointsAmount === 0 || (selectedUser.balance + pointsAmount) < 0}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  确认调整
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>修改角色</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => { setShowRoleModal(false); setSelectedUser(null); setNewRole(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">
                    当前角色: {selectedUser.role === 'admin' ? '管理员' : '普通用户'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">选择新角色</label>
                <div className="grid gap-2">
                  <label className={cn(
                    "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    newRole === 'user' && "border-primary bg-primary/5"
                  )}>
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={newRole === 'user'}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <p className="font-medium">普通用户</p>
                      <p className="text-xs text-muted-foreground">只能访问前台功能</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    newRole === 'admin' && "border-primary bg-primary/5"
                  )}>
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={newRole === 'admin'}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="sr-only"
                    />
                    <div>
                      <p className="font-medium">管理员</p>
                      <p className="text-xs text-muted-foreground">可以访问管理后台</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowRoleModal(false); setSelectedUser(null); setNewRole(''); }} disabled={submitting}>
                  取消
                </Button>
                <Button 
                  onClick={handleUpdateRole} 
                  disabled={submitting || newRole === selectedUser.role}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  确认修改
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
