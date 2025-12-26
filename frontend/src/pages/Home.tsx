import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, ShoppingBag, ShieldCheck, ArrowRight, Trophy, Gift, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Home() {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative text-center space-y-8 pt-16 md:pt-24 lg:pt-32 pb-12">
        <div className="space-y-4 max-w-4xl mx-auto px-4">
          <Badge variant="outline" className="py-1 px-4 rounded-full border-primary/20 bg-primary/5 text-primary animate-in fade-in zoom-in duration-500 delay-100">
            <Sparkles className="w-3 h-3 mr-2" /> 全新升级 · 沉浸式体验
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight animate-in slide-in-from-bottom-4 duration-500 delay-200">
            开启您的 <br className="md:hidden" />
            <span className="text-gradient-brand">幸运之旅</span>
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl leading-relaxed animate-in slide-in-from-bottom-4 duration-500 delay-300">
            公平公正的链上刮刮乐平台。即刻体验指尖的刺激，赢取丰厚积分，兑换真实好礼。
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <Link to="/lottery">
            <Button size="lg" className="h-12 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105">
              <Ticket className="w-5 h-5 mr-2" />
              立即刮奖
            </Button>
          </Link>
          <Link to="/exchange">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full hover:bg-secondary/80 backdrop-blur-sm bg-background/50 transition-all duration-300 hover:scale-105">
              <ShoppingBag className="w-5 h-5 mr-2" />
              浏览奖品
            </Button>
          </Link>
        </div>

        {/* Glow Effect behind Hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      </section>

      {/* Features Grid (Bento Style) */}
      <section className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-12 text-muted-foreground/80">核心特色</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard 
            icon={Trophy} 
            title="公平公正" 
            description="透明的开奖机制，每一次刮奖都充满惊喜与公平。算法开源，拒绝黑箱。"
            link="/lottery"
            linkText="去试试手气"
            delay={100}
          />
          <FeatureCard 
            icon={Gift} 
            title="积分兑换" 
            description="刮奖获得的积分可以在商城兑换各种精美礼品和虚拟道具。实时发货，秒速到账。"
            link="/exchange"
            linkText="浏览商城"
            delay={200}
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="安全保障" 
            description="保安码验证系统，确保您的每一次兑换都安全无忧。多重加密，保护隐私。"
            link="/verify"
            linkText="验证保安码"
            delay={300}
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative max-w-5xl mx-auto px-4">
        <div className="glass-card rounded-3xl p-8 md:p-16 text-center space-y-6 overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold">准备好赢取大奖了吗？</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4 mb-8">
              注册即送初始积分，每天登录还有额外奖励。加入我们，体验指尖上的刺激！
            </p>
            <Link to="/login">
              <Button size="lg" className="h-12 px-10 rounded-full font-semibold text-lg bg-foreground text-background hover:bg-foreground/90">
                <Zap className="w-5 h-5 mr-2 fill-current" />
                免费注册 / 登录
              </Button>
            </Link>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, link, linkText, delay }: any) {
  return (
    <Card className={cn(
      "glass-card hover:border-primary/30 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5",
      "animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
    )} style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base pt-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link to={link} className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1 group/link">
          {linkText} <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-1" />
        </Link>
      </CardContent>
    </Card>
  )
}

function Badge({ children, className }: any) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </div>
  )
}
