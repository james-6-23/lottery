import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthMode, getDevUsers, devLogin } from '../api/auth';
import type { DevUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'dev' | 'prod' | null>(null);
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Check for OAuth callback tokens in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        
        // TODO: Get user info and complete login
        // For now, just save tokens and redirect
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        navigate('/');
      }
    }
  }, [navigate]);

  // Fetch auth mode and dev users
  useEffect(() => {
    async function fetchAuthMode() {
      try {
        const { mode } = await getAuthMode();
        setMode(mode);

        if (mode === 'dev') {
          const { users } = await getDevUsers();
          setDevUsers(users);
        }
      } catch (err) {
        setError('无法连接到服务器');
        console.error('Failed to fetch auth mode:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuthMode();
  }, []);

  const handleDevLogin = async (userId: string) => {
    setLoginLoading(true);
    setError(null);

    try {
      const response = await devLogin(userId);
      login(response.access_token, response.refresh_token, response.user);
      navigate('/');
    } catch (err) {
      setError('登录失败，请重试');
      console.error('Dev login failed:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    // Redirect to OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/auth/oauth/linuxdo`;
  };

  if (loading) {
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎰 刮刮乐</h1>
          <p className="text-muted-foreground">彩票娱乐网站</p>
        </div>

        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-center">登录</h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {mode === 'dev' ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                开发模式 - 选择一个测试账号登录
              </p>
              
              <div className="space-y-2">
                {devUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleDevLogin(user.id)}
                    disabled={loginLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-lg">{user.role === 'admin' ? '👑' : '👤'}</span>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </div>
                    </div>
                    {loginLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">或</span>
                </div>
              </div>

              <button
                onClick={handleOAuthLogin}
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                使用 Linux.do 登录
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                使用 Linux.do 账号登录
              </p>
              
              <button
                onClick={handleOAuthLogin}
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                    <span>Linux.do 登录</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
