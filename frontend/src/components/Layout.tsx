import { useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">
            🎰 刮刮乐
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/lottery" className="hover:text-primary transition-colors">
              彩票大厅
            </Link>
            <Link to="/exchange" className="hover:text-primary transition-colors">
              兑换商城
            </Link>
            <Link to="/verify" className="hover:text-primary transition-colors">
              保安码验证
            </Link>
            <Link to="/wallet" className="hover:text-primary transition-colors">
              我的钱包
            </Link>
            <Link to="/profile" className="hover:text-primary transition-colors">
              个人中心
            </Link>
            
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-sm px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    管理后台
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm">{user.role === 'admin' ? '👑' : '👤'}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{user.username}</span>
                  {user.wallet && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {user.wallet.balance} 积分
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
              >
                登录
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © 2024 刮刮乐彩票娱乐网站 - 仅供娱乐
      </footer>
    </div>
  );
}
