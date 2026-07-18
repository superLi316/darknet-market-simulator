import Link from "next/link";
import { Terminal, Zap, TrendingUp, Shield, Skull, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cyber-glow pointer-events-none" />

      <header className="relative z-10 border-b border-cyan-500/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold tracking-wider text-cyan-400 cyber-glow-text">
              DARKNET
            </span>
            <span className="text-sm text-muted-foreground">v0.1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm">
                登录
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black">
                注册
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-magenta-500/30 bg-magenta-500/5 text-magenta-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            <span>赛博朋克生存模拟</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">暗网</span>
            <span className="text-cyan-400 cyber-glow-text">集市</span>
            <br />
            <span className="text-foreground">生存</span>
            <span className="text-magenta-400 cyber-glow-text">模拟器</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            在地下经济系统中挣扎求生。选择你的性格，平衡劳动与投机，
            在物资匮乏与价格波动的双重压力下，活下去，并且活得更好。
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 shadow-neon-cyan"
              >
                进入暗网
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                了解更多
              </Button>
            </Link>
          </div>
        </div>

        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border border-cyan-500/20 bg-card/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">动态经济系统</h3>
            <p className="text-muted-foreground">
              价格随供需关系实时波动，结合随机事件与系统调控，
              每一次买卖都是一场智力博弈。
            </p>
          </div>

          <div className="p-6 rounded-lg border border-magenta-500/20 bg-card/50 backdrop-blur-sm hover:border-magenta-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-magenta-500/10 flex items-center justify-center mb-4">
              <Skull className="w-6 h-6 text-magenta-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">生存压力驱动</h3>
            <p className="text-muted-foreground">
              每日消耗食物与饮用水，健康值归零即被系统清除。
              生存是第一要务，财富只是附属品。
            </p>
          </div>

          <div className="p-6 rounded-lg border border-yellow-500/20 bg-card/50 backdrop-blur-sm hover:border-yellow-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
              <Coins className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">五种性格类型</h3>
            <p className="text-muted-foreground">
              勤奋型、懒惰型、投机型、谨慎型、疯狂型——
              每种性格带来截然不同的经济乘数与生存策略。
            </p>
          </div>

          <div className="p-6 rounded-lg border border-green-500/20 bg-card/50 backdrop-blur-sm hover:border-green-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">技能成长系统</h3>
            <p className="text-muted-foreground">
              通过劳动积累货币，购买技能芯片提升效率，
              形成正反馈循环，逐步扩大你的经济优势。
            </p>
          </div>

          <div className="p-6 rounded-lg border border-cyan-500/20 bg-card/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
              <Terminal className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">管理后台</h3>
            <p className="text-muted-foreground">
              管理员可宏观调控经济、发布系统事件、
              管理玩家账号，所有操作均有审计日志可追溯。
            </p>
          </div>

          <div className="p-6 rounded-lg border border-magenta-500/20 bg-card/50 backdrop-blur-sm hover:border-magenta-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-magenta-500/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-magenta-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">奖杯与排行榜</h3>
            <p className="text-muted-foreground">
              货币兑换奖杯记录成就，大奖杯数量决定排行榜名次，
              在生存中竞争，在竞争中生存。
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-cyan-500/20 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>DarkNet Market Survival Simulator © 2024</p>
          <p className="mt-2">仅限娱乐，请勿模仿</p>
        </div>
      </footer>
    </div>
  );
}
