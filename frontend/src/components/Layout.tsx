import { useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  Wallet,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  currentPath: string;
  onClick?: () => void;
}

function NavLink({ to, children, icon: Icon, currentPath, onClick }: NavLinkProps) {
  const isActive = currentPath === to;
  return (
    <Link to={to} onClick={onClick}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn("w-full justify-start md:w-auto md:justify-center gap-2", isActive && "bg-secondary")}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </Button>
    </Link>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 mr-6">
            <span className="text-2xl">🎰</span>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hidden md:inline-block">
              刮刮乐
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/lottery" icon={Ticket} currentPath={location.pathname}>彩票大厅</NavLink>
            <NavLink to="/exchange" icon={ShoppingBag} currentPath={location.pathname}>兑换商城</NavLink>
            <NavLink to="/verify" icon={ShieldCheck} currentPath={location.pathname}>保安码验证</NavLink>
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:flex items-center gap-3 pr-4 border-r mr-4">
                  <Link to="/wallet">
                    <Badge variant="secondary" className="px-3 py-1 gap-1 hover:bg-secondary/80 cursor-pointer">
                      <Wallet className="h-3 w-3" />
                      <span>{user.wallet?.balance || 0} 积分</span>
                    </Badge>
                  </Link>
                </div>

                <div className="hidden md:flex items-center gap-2">
                   {user.role === 'admin' && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 dark:text-yellow-400 dark:border-yellow-900 dark:hover:bg-yellow-900/20">
                        <LayoutDashboard className="h-4 w-4" />
                        管理后台
                      </Button>
                    </Link>
                  )}
                  
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="gap-2">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="max-w-[100px] truncate">{user.username}</span>
                    </Button>
                  </Link>

                  <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
                    <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button>登录</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t p-4 space-y-4 bg-background">
            <nav className="flex flex-col gap-2">
              <NavLink to="/lottery" icon={Ticket} currentPath={location.pathname} onClick={closeMobileMenu}>彩票大厅</NavLink>
              <NavLink to="/exchange" icon={ShoppingBag} currentPath={location.pathname} onClick={closeMobileMenu}>兑换商城</NavLink>
              <NavLink to="/verify" icon={ShieldCheck} currentPath={location.pathname} onClick={closeMobileMenu}>保安码验证</NavLink>
              <NavLink to="/wallet" icon={Wallet} currentPath={location.pathname} onClick={closeMobileMenu}>我的钱包</NavLink>
              <NavLink to="/profile" icon={User} currentPath={location.pathname} onClick={closeMobileMenu}>个人中心</NavLink>
            </nav>
            
            {isAuthenticated && user ? (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.wallet?.balance || 0} 积分</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      管理后台
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="border-t pt-4">
                <Link to="/login" className="block">
                  <Button className="w-full">登录</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} 刮刮乐彩票娱乐网站 - 仅供娱乐
          </p>
        </div>
      </footer>
    </div>
  );
}
