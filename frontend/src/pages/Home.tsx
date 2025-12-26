import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Zap, Globe, ArrowRight, CreditCard, Wallet } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col justify-center relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 w-full z-10 grid lg:grid-cols-2 gap-12 items-center py-12">
        
        {/* Left Column: Text & Actions */}
        <div className="space-y-8 lg:pr-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              LINUX DO <span className="text-[#5e5ce6] font-serif italic">Credit</span>
              <br />
              <span className="text-[#5e5ce6] text-4xl lg:text-6xl block mt-2">让积分流通更简单</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
              专为 LINUX DO 社区打造的积分流通基础设施
              <br />
              快速集成、全球覆盖、安全可靠，助您轻松流通积分。
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link to="/login">
              <Button size="lg" className="h-14 px-8 rounded-full bg-[#5e5ce6] hover:bg-[#4b4ac6] text-white shadow-lg shadow-[#5e5ce6]/25 text-base font-semibold transition-all hover:scale-105">
                立即开始 <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="secondary" className="h-14 px-8 rounded-full bg-[#EBEBFD] text-[#5e5ce6] hover:bg-[#EBEBFD]/80 text-base font-semibold transition-all hover:scale-105">
                了解更多
              </Button>
            </Link>
          </div>

          <div className="pt-8 border-t border-slate-200/60 flex flex-wrap gap-8 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span>极速到账</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              <span>全球覆盖</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span>安全加密</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Card */}
        <div className="relative animate-in fade-in zoom-in duration-700 delay-200 hidden lg:block">
          <div className="relative z-10 transform perspective-1000 rotate-y-12 rotate-x-6 hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-500 ease-out">
            {/* Glass Card Container */}
            <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 relative overflow-hidden">
              
              {/* Floating Notification */}
              <div className="absolute top-8 right-8 bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center gap-4 animate-bounce-slow">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Income</div>
                  <div className="text-sm font-bold text-slate-900">+ LDC 240.00</div>
                </div>
              </div>

              {/* Main Card Graphic */}
              <div className="mt-16 bg-gradient-to-br from-[#F3F0FF] to-[#E6E4FF] rounded-3xl p-8 aspect-[1.58/1] relative overflow-hidden border border-white/60 shadow-inner">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5e5ce6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-slate-700" />
                    <span className="font-medium text-slate-700 tracking-wide">LINUX DO Credit</span>
                  </div>
                  
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Total Balance</div>
                    <div className="text-4xl font-bold text-slate-900 tracking-tight">
                      LDC 12,450.00
                    </div>
                  </div>

                  <div className="flex justify-end">
                     <div className="w-10 h-10 rounded-full bg-[#5e5ce6] shadow-lg shadow-[#5e5ce6]/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Blur behind card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-200/30 to-purple-200/30 blur-[80px] -z-10 rounded-full" />
        </div>

      </main>
    </div>
  );
}
