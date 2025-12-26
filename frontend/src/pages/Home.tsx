import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  CreditCard,
  Wallet,
  Activity,
  Users,
  TrendingUp,
  Code,
  Terminal,
  Copy,
  Book,
  Key,
  Github,
  Twitter,

  Linkedin,
  Send,
  Ticket
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { value: 400 }, { value: 300 }, { value: 600 }, { value: 400 },
  { value: 500 }, { value: 700 }, { value: 600 }, { value: 800 }
];

export function Home() {
  return (
    <div className="relative w-full overflow-x-hidden selection:bg-primary selection:text-primary-foreground font-sans">

      {/* Background Decorations */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 w-full min-h-[90vh] flex flex-col justify-center px-6 py-20 lg:py-0">
        <div className="container mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <div className="max-w-2xl animate-in fade-in slide-in-from-left-8 duration-1000">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 text-foreground">
              KFC <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Lottery</span>
              <br />
              <span className="text-3xl md:text-5xl block mt-2 font-medium opacity-90">让梦想触手可及</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
              专为 KFC 社区打造的去中心化积分奖池系统

              <br className="hidden md:block" />
              公平透明、即时兑付、安全可靠，开启您的幸运之旅。
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link className="w-full sm:w-auto" to="/lottery">
                <Button size="lg" className="w-full h-14 px-10 rounded-full font-semibold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/25">
                  立即参与 <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link className="w-full sm:w-auto" to="/about">
                <Button size="lg" variant="secondary" className="w-full h-14 px-10 rounded-full font-semibold text-lg hover:scale-105 transition-all bg-secondary/80 backdrop-blur-sm">
                  了解更多
                </Button>
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap gap-8 text-sm font-medium text-muted-foreground border-t border-border/50 pt-8">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                <span>即时开奖</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span>全链透明</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span>安全加密</span>
              </div>
            </div>
          </div>

          {/* Right Column Visuals */}
          <div className="hidden lg:block relative animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md aspect-square">
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />

              <div className="relative z-10 w-full h-[280px] bg-background/40 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl p-8 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-500">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                    <CreditCard className="size-6" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">KFC Lottery</span>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="h-2 w-32 bg-foreground/10 rounded-full" />
                    <div className="h-2 w-20 bg-foreground/10 rounded-full opacity-50" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Jackpot</p>
                      <p className="text-4xl font-black tracking-tighter">KFC 1,024,500</p>
                    </div>
                    <div className="size-12 rounded-full bg-gradient-to-tr from-primary to-primary/40 shadow-lg shadow-primary/20" />
                  </div>
                </div>
              </div>

              {/* Floating Element */}
              <div className="absolute -top-10 -right-6 z-20 bg-background/80 backdrop-blur-xl border border-border p-5 rounded-2xl shadow-2xl animate-bounce-slow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <Wallet className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Latest Win</p>
                    <p className="text-lg font-bold">+ KFC 5,000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 w-full py-24 px-6 bg-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">见证每一份幸运的诞生</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">实时数据洞察，助您了解社区奖池动态，掌握每一次幸运先机。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2 md:row-span-2 rounded-3xl glass-card p-8 flex flex-col justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Activity className="size-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">奖池波动趋势</span>
                </div>
                <div className="text-5xl font-black tracking-tighter mb-2 text-gradient">Coming Soon</div>
                <p className="text-muted-foreground">实时监控全局奖池累计与派发现况</p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-40 opacity-40 group-hover:opacity-60 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-blue-500/5 border border-blue-500/10 p-8 flex flex-col justify-end relative overflow-hidden group hover:bg-blue-500/10 transition-colors">
              <Users className="absolute top-6 right-6 size-12 text-blue-500/20 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-4xl font-black mb-1">50,000+</div>
                <div className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">活跃参与者</div>
              </div>
            </div>

            <div className="rounded-3xl bg-green-500/5 border border-green-500/10 p-8 flex flex-col justify-end relative overflow-hidden group hover:bg-green-500/10 transition-colors">
              <TrendingUp className="absolute top-6 right-6 size-12 text-green-500/20 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-4xl font-black mb-1">2,400%</div>
                <div className="text-sm text-muted-foreground font-semibold uppercase tracking-widest">收益增长率</div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl bg-primary/5 border border-primary/10 p-8 relative overflow-hidden group">
              <div className="relative z-10 flex flex-col justify-center h-full">
                <div className="text-5xl md:text-6xl font-black tracking-tighter mb-2">1.2M+</div>
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">已累计发放奖金 (KFC)</span>
              </div>
              <Globe className="absolute -right-10 -bottom-10 size-48 text-primary/5 group-hover:rotate-12 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="relative z-10 w-full py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
              为什么选择 <span className="text-primary">KFC Lottery</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              不仅仅是一个彩票平台，更是社区公平与活力的象征。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="size-6" />}
              title="即时流通"
              desc="积分兑换与奖励发放秒级响应，无需等待，即刻享受胜利成果。"
              span="lg:col-span-2"
            />
            <FeatureCard
              icon={<Globe className="size-6" />}
              title="全球可访问"
              desc="无论您身处何地，只要连接 KFC，即可参与幸运角逐。"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-6" />}
              title="安全透明"
              desc="每一张彩票，每一次开奖均可回溯，全流程上链保证绝对公正。"
            />
            <FeatureCard
              icon={<Activity className="size-6" />}
              title="实时掌控"
              desc="多维度的实时看板，让您对每一笔积分的流转了如指掌。"
            />
            <FeatureCard
              icon={<Ticket className="size-6" />}
              title="公平竞技"
              desc="独创的防作弊算法，确保每位用户都有平等的获胜机会。"
            />
            <FeatureCard
              icon={<Code className="size-6" />}
              title="开发者友好"
              desc="提供强大的 API 支持，帮助社区开发者轻松集成奖池功能。"
              span="lg:col-span-2"
            />
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="relative z-10 w-full py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-2xl">
              <div className="flex justify-between items-center px-5 py-3 border-b border-white/10 bg-slate-900/50">
                <div className="flex gap-2">
                  <div className="size-3 rounded-full bg-[#ff5f56]" />
                  <div className="size-3 rounded-full bg-[#ffbd2e]" />
                  <div className="size-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <Terminal className="size-3" /> bash
                </div>
                <div className="w-10" />
              </div>
              <div className="p-8 overflow-x-auto group relative">
                <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                  <Copy className="size-4" />
                </button>
                <pre className="text-sm font-mono text-slate-300 leading-relaxed uppercase">
                  <code>
                    <span className="text-purple-400">curl</span> <span className="text-green-400">https://api.kfc.com/lottery/ticket</span> \<br />
                    {"  "}-H <span className="text-yellow-400">"Authorization: Bearer KFC_SK_..."</span> \<br />
                    {"  "}-d <span className="text-blue-400">pool_id</span>=<span className="text-orange-400">"KFC_PREMIUM"</span> \<br />
                    {"  "}-d <span className="text-blue-400">quantity</span>=<span className="text-orange-400">1</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>

          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]">
              极简集成，<br />赋能社区应用
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              标准化的 RESTful API 接口，完善的 Webhook 机制。无论您的应用是用什么语言编写，三分钟内即可完成奖池功能的接入。
            </p>
            <ul className="space-y-4">
              {[
                "完全兼容 KFC OAuth 认证",
                "毫秒级响应的开奖接口",
                "详尽的开发文档与 SDK",
                "沙盒环境支持，零成本调试"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="size-4" />
                  </div>
                  <span className="text-foreground/80 font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" variant="outline" className="rounded-full px-8 border-border">
                <Book className="mr-2 size-4" /> API 文档
              </Button>
              <Button size="lg" className="rounded-full px-8">
                <Key className="mr-2 size-4" /> 获取 API Key
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-border mt-12 bg-background/40 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-8 mb-20">
            <div className="lg:col-span-4 space-y-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20">
                  KFC
                </div>
                <span className="text-2xl font-black tracking-tight">KFC Lottery</span>
              </Link>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                为 KFC 社区开发者打造的奖池认证与分发平台。公平、有趣、高效，致力于为每一位社区成员创造惊喜价值。
              </p>
              <div className="flex gap-4">
                <SocialLink icon={<Github className="size-5" />} href="#" />
                <SocialLink icon={<Twitter className="size-5" />} href="#" />
                <SocialLink icon={<Linkedin className="size-5" />} href="#" />
                <SocialLink icon={<Send className="size-5" />} href="#" />
              </div>
            </div>

            <div className="lg:col-span-2 lg:col-start-6">
              <FooterHeading>产品</FooterHeading>
              <FooterList items={["玩法介绍", "奖池规则", "历史开奖", "API 参考"]} />
            </div>

            <div className="lg:col-span-2">
              <FooterHeading>资源</FooterHeading>
              <FooterList items={["公告中心", "社区讨论", "GitHub 贡献", "安全策略"]} />
            </div>

            <div className="lg:col-span-3">
              <FooterHeading>订阅资讯</FooterHeading>
              <p className="text-sm text-muted-foreground mb-6">获取最新的大奖快报和开发者动态。</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="flex-1 px-5 py-3 rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                <Button size="icon" className="size-11 rounded-xl shrink-0">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground font-medium">
            <p>© 2025 KFC Lottery. All rights reserved.</p>
            <div className="flex gap-10">
              <FooterBottomLink href="#">隐私协议</FooterBottomLink>
              <FooterBottomLink href="#">服务条款</FooterBottomLink>
              <FooterBottomLink href="#">Cookie 设置</FooterBottomLink>
            </div>
          </div>
        </div>

        {/* Huge Bottom Decoration */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none opacity-[0.03] select-none">
          <div className="text-[18vw] font-black leading-none text-foreground whitespace-nowrap text-center translate-y-1/3">
            KFC LOTTERY
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, span = "" }: { icon: React.ReactNode, title: string, desc: string, span?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl p-8 glass-card hover:bg-background/80 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 ${span}`}>
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity duration-500 scale-150 -rotate-12 pointer-events-none">
        {icon}
      </div>
      <div className="relative z-10 space-y-4">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {desc}
        </p>
        <div className="flex items-center text-xs font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          LEARN MORE <ArrowRight className="ml-1 size-3" />
        </div>
      </div>
    </div>
  );
}

function SocialLink({ icon, href }: { icon: React.ReactNode, href: string }) {
  return (
    <a href={href} className="size-11 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
      {icon}
    </a>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-foreground mb-8 uppercase tracking-widest text-xs">{children}</h3>;
}

function FooterList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>
          <a href="#" className="hover:text-primary transition-colors flex items-center group">
            <span className="relative">
              {item}
              <span className="absolute left-0 -bottom-0.5 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function FooterBottomLink({ href, children }: { href: string, children: React.ReactNode }) {
  return <a href={href} className="hover:text-primary transition-colors">{children}</a>;
}
