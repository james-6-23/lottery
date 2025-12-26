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
        className={cn(
          "w-full justify-start md:w-auto md:justify-center gap-2 relative",
          isActive && "bg-secondary/80 font-medium",
          "hover:bg-secondary/60 transition-all duration-200"
        )}
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex flex-col font-sans antialiased selection:bg-primary/10">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-[-1] bg-grid-pattern opacity-[0.4] pointer-events-none" />
      
      {/* Gradient Blob for subtle color splash */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none z-[-1]" />

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 mr-6 group">
            <span className="text-2xl transition-transform group-hover:scale-110 duration-300">🎰</span>
            <span className="text-lg font-bold tracking-tight text-gradient-brand hidden md:inline-block">
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
                <div className="hidden md:flex items-center gap-3 pr-4 border-r border-border/40 mr-4">
                  <Link to="/wallet">
                    <Badge variant="secondary" className="px-3 py-1 gap-1.5 hover:bg-secondary/80 cursor-pointer transition-colors border-border/50 bg-background/50 backdrop-blur-sm">
                      <Wallet className="h-3 w-3 text-primary" />
                      <span className="font-mono">{user.wallet?.balance || 0}</span>
                      <span className="text-xs text-muted-foreground">积分</span>
                    </Badge>
                  </Link>
                </div>

                <div className="hidden md:flex items-center gap-2">
                   {user.role === 'admin' && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="gap-2 h-8 text-xs border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">
                        <LayoutDashboard className="h-3 w-3" />
                        管理后台
                      </Button>
                    </Link>
                  )}
                  
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="gap-2 h-8 pl-1">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.username} 
                          className="w-6 h-6 rounded-full ring-1 ring-border"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                      <span className="max-w-[100px] truncate text-sm font-medium">{user.username}</span>
                    </Button>
                  </Link>

                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="退出登录">
                    <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button size="sm" className="font-medium">登录</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-9 w-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-border/40 p-4 space-y-4 bg-background/95 backdrop-blur-xl absolute w-full z-50 shadow-lg animate-in slide-in-from-top-5">
            <nav className="flex flex-col gap-2">
              <NavLink to="/lottery" icon={Ticket} currentPath={location.pathname} onClick={closeMobileMenu}>彩票大厅</NavLink>
              <NavLink to="/exchange" icon={ShoppingBag} currentPath={location.pathname} onClick={closeMobileMenu}>兑换商城</NavLink>
              <NavLink to="/verify" icon={ShieldCheck} currentPath={location.pathname} onClick={closeMobileMenu}>保安码验证</NavLink>
              <NavLink to="/wallet" icon={Wallet} currentPath={location.pathname} onClick={closeMobileMenu}>我的钱包</NavLink>
              <NavLink to="/profile" icon={User} currentPath={location.pathname} onClick={closeMobileMenu}>个人中心</NavLink>
            </nav>
            
            {isAuthenticated && user ? (
              <div className="border-t border-border/40 pt-4 space-y-3">
                <div className="flex items-center justify-between px-2 py-2 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-full ring-1 ring-border" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.username}</span>
                      <span className="text-xs text-muted-foreground font-mono">{user.wallet?.balance || 0} 积分</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 h-9">
                      <LayoutDashboard className="h-4 w-4" />
                      管理后台
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="border-t border-border/40 pt-4">
                <Link to="/login" className="block">
                  <Button className="w-full">登录</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-500">
        <Outlet />
      </main>

      <footer className="border-t border-border/40 py-8 mt-auto bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <span className="text-2xl">🎰</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} 刮刮乐 · Fair & Fun Lottery
          </p>
        </div>
      </footer>
    </div>
  );
}