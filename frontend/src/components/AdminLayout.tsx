import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  BarChart3, 
  Ticket, 
  ShoppingBag, 
  Users, 
  Settings, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Home,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/admin', label: '数据概览', icon: LayoutDashboard, exact: true },
  { path: '/admin/statistics', label: '数据统计', icon: BarChart3 },
  { path: '/admin/lottery', label: '彩票管理', icon: Ticket, exact: true },
  { path: '/admin/lottery/designer', label: '彩票设计器', icon: Palette },
  { path: '/admin/products', label: '商品管理', icon: ShoppingBag },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/settings', label: '系统设置', icon: Settings },
  { path: '/admin/logs', label: '操作日志', icon: FileText },
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
      <aside 
        className={cn(
          "bg-card border-r transition-all duration-300 flex flex-col relative",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b overflow-hidden whitespace-nowrap">
           <Link to="/admin" className="flex items-center gap-2 font-bold text-primary text-lg">
             <span className="text-2xl">🎰</span>
             <span className={cn("transition-opacity duration-300", !sidebarOpen && "opacity-0 hidden")}>
               管理后台
             </span>
           </Link>
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md z-10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
            >
              <Button
                variant={isActive(item.path, item.exact) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  !sidebarOpen && "justify-center px-2"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", sidebarOpen && "mr-2")} />
                {sidebarOpen && <span>{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div className="p-2 border-t">
          <Link to="/">
            <Button variant="outline" className={cn("w-full", !sidebarOpen && "px-0 justify-center")}>
               <Home className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
               {sidebarOpen && "返回前台"}
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold truncate">
            {NAV_ITEMS.find(item => isActive(item.path, item.exact))?.label || '管理后台'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l">
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
                <span className="text-sm font-medium hidden sm:inline-block">{user?.username}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
                <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
