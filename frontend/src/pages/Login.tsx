import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthMode, getDevUsers, devLogin } from '../api/auth';
import type { DevUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, User, Crown, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    // Redirect to OAuth endpoint - 使用相对路径
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api');
    window.location.href = `${apiBase}/auth/oauth/linuxdo`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl"></div>
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="text-white text-xl font-semibold mt-6 tracking-wide">正在加载...</p>
        <div className="flex gap-2 mt-3">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-6">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md w-full border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative bg-white p-4 rounded-full shadow-2xl ring-4 ring-white/50">
              <span className="text-5xl">🎰</span>
            </div>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
          刮刮乐彩票
        </h1>
        <p className="text-center text-slate-600 mb-8 text-sm">
          🎫 体验真实的刮彩票乐趣
        </p>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'dev' ? (
          <div className="space-y-6">
            {/* 开发模式用户列表 */}
            <div className="space-y-3">
              {devUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleDevLogin(user.id)}
                  disabled={loginLoading}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 text-left group",
                    loginLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full" />
                    ) : (
                      <span className="text-2xl">{user.role === 'admin' ? '👑' : '👤'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{user.username}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.role === 'admin' ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                        {user.role === 'admin' ? <Crown className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                      <span className="text-xs text-slate-500">ID: {user.id}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            {/* 分隔线 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-500">或者</span>
              </div>
            </div>

            {/* OAuth 登录按钮 */}
            <button
              onClick={handleOAuthLogin}
              disabled={loginLoading}
              className="group relative w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4 px-6 rounded-xl font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <img 
                  src="https://linux.do/uploads/default/original/4X/c/c/d/ccd8c210609d498cbeb3d5201d4c259348447562.png" 
                  alt="Linux Do" 
                  className="w-6 h-6"
                />
                <span>使用 Linux.do 登录</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 生产模式 - Linux.do OAuth 登录按钮 */}
            <button
              onClick={handleOAuthLogin}
              disabled={loginLoading}
              className="group relative w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loginLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-lg">登录中...</span>
                  </>
                ) : (
                  <>
                    <img 
                      src="https://linux.do/uploads/default/original/4X/c/c/d/ccd8c210609d498cbeb3d5201d4c259348447562.png" 
                      alt="Linux Do" 
                      className="w-6 h-6"
                    />
                    <span className="text-lg">使用 Linux Do 账户登录</span>
                    <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </div>
            </button>
          </div>
        )}

        {/* 安全提示 */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="w-4 h-4" />
          <span>安全登录，保护您的隐私</span>
        </div>

        {/* 服务条款 */}
        <p className="text-xs text-slate-400 text-center mt-4">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
