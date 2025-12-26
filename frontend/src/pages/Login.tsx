import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthMode, getDevUsers, devLogin } from '../api/auth';
import type { DevUser } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ChevronRight, ExternalLink, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'dev' | 'prod' | null>(null);
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

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
        window.history.replaceState(null, '', window.location.pathname);
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
    if (!agreed) {
        setError('请先阅读并同意服务条款及隐私政策');
        return;
    }
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
    if (!agreed) return;
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api');
    window.location.href = `${apiBase}/auth/oauth/linuxdo`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#5e5ce6]/30 border-t-[#5e5ce6] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#F8F9FC]">
      {/* Abstract Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-100/40 rounded-full blur-[120px]" />
         <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/60 blur-[100px] rotate-45" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-slate-900 flex items-center justify-center gap-2">
            <span>LINUX DO</span>
            <span className="font-serif italic text-[#6B69F6]">Credit</span>
          </h1>
          <p className="text-slate-500 text-sm">简单、安全，专为社区设计</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50/80 backdrop-blur text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="w-full space-y-6">
          {mode === 'dev' ? (
            <div className="space-y-4">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider text-center mb-4">开发环境测试账号</div>
              {devUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleDevLogin(user.id)}
                  disabled={loginLoading}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-white/50 hover:bg-white hover:border-[#6B69F6]/50 hover:shadow-md transition-all duration-200 text-left group",
                    loginLoading && "opacity-50 cursor-not-allowed",
                    !agreed && "opacity-70"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-[#F0F0FF] text-[#6B69F6] flex items-center justify-center shrink-0 font-medium">
                    {user.username.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{user.username}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500 font-normal">
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#6B69F6] transition-colors" />
                </button>
              ))}
              
               <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#F8F9FC] px-2 text-slate-400">Or</span></div>
               </div>
            </div>
          ) : null}

          {/* Main Login Button */}
          <button
            onClick={handleOAuthLogin}
            disabled={loginLoading || !agreed}
            className={cn(
              "group w-full h-12 bg-[#5e5ce6] text-white rounded-full font-medium shadow-lg shadow-[#5e5ce6]/25 hover:shadow-[#5e5ce6]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2",
              (!agreed || loginLoading) && "opacity-50 cursor-not-allowed shadow-none hover:translate-y-0 hover:shadow-none bg-slate-400"
            )}
          >
            {loginLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>使用 LINUX DO 登录</span>
              </>
            )}
          </button>

          {/* Agreement Checkbox */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
                onClick={() => setAgreed(!agreed)}
                className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    agreed ? "bg-[#5e5ce6] border-[#5e5ce6]" : "bg-transparent border-slate-300 hover:border-[#5e5ce6]"
                )}
            >
                {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <label className="text-sm text-slate-500 cursor-pointer select-none" onClick={() => setAgreed(!agreed)}>
              我已阅读并同意
              <a href="#" className="text-slate-600 hover:text-[#5e5ce6] mx-1 border-b border-slate-300 hover:border-[#5e5ce6] transition-colors pb-0.5">服务条款</a>
              及
              <a href="#" className="text-slate-600 hover:text-[#5e5ce6] mx-1 border-b border-slate-300 hover:border-[#5e5ce6] transition-colors pb-0.5">隐私政策</a>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 w-full text-center">
        <p className="text-xs text-slate-400">© 2025 LINUX DO Credit. 版权所有</p>
      </div>
    </div>
  );
}
