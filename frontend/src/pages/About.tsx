import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Zap, Globe, Lock, Repeat, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function About() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100/30 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
            关于 <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">LINUX DO Credit</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 leading-relaxed">
            专为 LINUX DO 社区打造的下一代积分流通基础设施。
            <br className="hidden md:block" />
            我们致力于构建一个安全、高效、透明的价值交换网络。
          </p>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-none shadow-lg shadow-blue-900/5 bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
                <Zap className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">极速流转</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 leading-relaxed">
                告别繁琐的审核流程。通过先进的链上技术，实现毫秒级的积分转账与结算，让价值流动不再受限。
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg shadow-purple-900/5 bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 text-purple-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">安全合规</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 leading-relaxed">
                采用银行级加密算法，配合社区独有的保安码验证体系，全方位守护您的数字资产安全。
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg shadow-pink-900/5 bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mb-4 text-pink-600">
                <Globe className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">生态互联</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 leading-relaxed">
                打通社区内外部生态，支持多种场景下的积分应用。从刮刮乐到商城兑换，一站式满足所有需求。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-900">为什么选择我们？</h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-blue-100/50 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">隐私保护</h3>
                  <p className="text-slate-500">严格的数据隐私保护机制，确保您的交易记录和个人信息仅对您可见。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-purple-100/50 flex items-center justify-center shrink-0">
                  <Repeat className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">即时兑换</h3>
                  <p className="text-slate-500">支持积分与实物奖品的实时兑换，自动化的库存管理系统确保发货无忧。</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-pink-100/50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">社区共建</h3>
                  <p className="text-slate-500">源于社区，服务社区。每一次升级都聆听用户的声音，与 LINUX DO 共同成长。</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-10"></div>
            <div className="relative bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl">
                  L
                </div>
                <div>
                  <div className="font-semibold text-slate-900">LINUX DO Credit</div>
                  <div className="text-sm text-slate-400">System Status</div>
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Running
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">总交易量</span>
                    </div>
                    <span className="font-bold text-slate-900">2,548,900 LDC</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600">活跃用户</span>
                    </div>
                    <span className="font-bold text-slate-900">12,450+</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                 <p className="text-sm text-slate-400 mb-4">准备好加入了吗？</p>
                 <Link to="/login">
                    <Button className="w-full bg-[#5e5ce6] hover:bg-[#4b4ac6] text-white rounded-xl h-12">
                        立即开始体验
                    </Button>
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-white border-t border-slate-100 py-16 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">开启您的幸运之旅</h2>
            <p className="text-slate-500 mb-8 max-w-xl mx-auto">
                无论是想体验刮刮乐的乐趣，还是寻找积分变现的渠道，LINUX DO Credit 都是您的最佳选择。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/login">
                    <Button size="lg" className="rounded-full px-8 bg-[#5e5ce6] hover:bg-[#4b4ac6]">
                        免费注册 / 登录
                    </Button>
                </Link>
                <Link to="/lottery">
                    <Button size="lg" variant="outline" className="rounded-full px-8 border-slate-200 text-slate-600 hover:bg-slate-50">
                        浏览现有活动
                    </Button>
                </Link>
            </div>
        </div>
      </section>
    </div>
  );
}
