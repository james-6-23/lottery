import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/admin', label: '数据概览', icon: '📊', exact: true },
  { path: '/admin/statistics', label: '数据统计', icon: '📈' },
  { path: '/admin/lottery', label: '彩票管理', icon: '🎰' },
  { path: '/admin/products', label: '商品管理', icon: '🛒' },
  { path: '/admin/users', label: '用户管理', icon: '👥' },
  { path: '/admin/settings', label: '系统设置', icon: '⚙️' },
  { path: '/admin/logs', label: '操作日志', icon: '📝' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-card border-r transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <Link to="/admin" className="text-lg font-bold text-primary flex items-center gap-2">
              <span>🎰</span>
              <span>管理后台</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div className="p-4 border-t">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">🏠</span>
            {sidebarOpen && <span>返回前台</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">
            {NAV_ITEMS.find(item => isActive(item.path, item.exact))?.label || '管理后台'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.username} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">👑</span>
                </div>
              )}
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              退出
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
