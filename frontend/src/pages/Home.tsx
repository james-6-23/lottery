import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, ShoppingBag, ShieldCheck, ArrowRight, Trophy, Gift } from 'lucide-react';

export function Home() {
  return (
    <div className="space-y-12 pb-10">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12 md:py-24">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            欢迎来到刮刮乐
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            体验最真实的在线刮彩票乐趣，即刻开启您的幸运之旅！<br/>
            赢取积分，兑换丰富好礼。
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Link to="/lottery">
            <Button size="lg" className="gap-2">
              <Ticket className="w-5 h-5" />
              立即刮奖
            </Button>
          </Link>
          <Link to="/exchange">
            <Button size="lg" variant="outline" className="gap-2">
              <ShoppingBag className="w-5 h-5" />
              查看奖品
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Trophy className="w-10 h-10 text-primary mb-2" />
            <CardTitle>公平公正</CardTitle>
            <CardDescription>
              透明的开奖机制，每一次刮奖都充满惊喜与公平。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/lottery" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
              去试试手气 <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Gift className="w-10 h-10 text-primary mb-2" />
            <CardTitle>积分兑换</CardTitle>
            <CardDescription>
              刮奖获得的积分可以在商城兑换各种精美礼品和虚拟道具。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/exchange" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
              浏览商城 <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <ShieldCheck className="w-10 h-10 text-primary mb-2" />
            <CardTitle>安全保障</CardTitle>
            <CardDescription>
              保安码验证系统，确保您的每一次兑换都安全无忧。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/verify" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
              验证保安码 <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Stats / Call to Action */}
      <section className="bg-muted/50 rounded-2xl p-8 md:p-12 text-center space-y-6">
        <h2 className="text-3xl font-bold">准备好赢取大奖了吗？</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          注册即送初始积分，每天登录还有额外奖励。加入我们，体验指尖上的刺激！
        </p>
        <Link to="/login">
          <Button variant="secondary" size="lg" className="mt-4">
            免费注册 / 登录
          </Button>
        </Link>
      </section>
    </div>
  )
}
