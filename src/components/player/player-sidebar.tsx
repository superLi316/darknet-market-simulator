"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Store,
  Package,
  Zap,
  Trophy,
  Award,
  Crown,
  User,
  Bell,
  LogOut,
  Terminal,
  Calendar,
  FastForward,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "控制台", icon: LayoutDashboard },
  { href: "/work", label: "劳动", icon: Briefcase },
  { href: "/market", label: "黑市", icon: Store },
  { href: "/inventory", label: "库存", icon: Package },
  { href: "/skills", label: "技能", icon: Zap },
  { href: "/trophies", label: "奖杯", icon: Trophy },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/achievements", label: "成就", icon: Award },
  { href: "/titles", label: "头衔", icon: Crown },
];

interface PlayerSidebarProps {
  username: string;
  balance: number;
  health: number;
  stamina: number;
  gameDay: number;
}

export function PlayerSidebar({
  username,
  balance,
  health,
  stamina,
  gameDay,
}: PlayerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [skipping, setSkipping] = useState(false);

  async function handleSkipDay() {
    if (skipping) return;
    setSkipping(true);
    try {
      const res = await fetch("/api/gameday/skip", {
        method: "POST",
      });
      const data = await res.json();
      if (data.code === 200) {
        const inner = data.data;
        if (inner && inner.success === false) {
          toast({
            title: "无法跳过游戏日",
            description:
              inner.reason === "USER_NOT_ALIVE"
                ? "角色已死亡，无法跳过游戏日"
                : inner.reason === "USER_NOT_FOUND"
                ? "用户不存在"
                : "请稍后重试",
            variant: "destructive",
          });
          setSkipping(false);
          return;
        }
        toast({
          title: "游戏日已推进",
          description: inner?.newGameDay
            ? `已进入 Game Day ${inner.newGameDay}，体力已恢复`
            : "新一天已开始，体力已恢复",
        });
        // 刷新页面以获取最新数据
        router.refresh();
      } else {
        toast({
          title: "跳过失败",
          description: data.message || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[SKIP_DAY_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="flex h-screen flex-col border-r border-cyan-500/20 bg-card/50 backdrop-blur-sm w-64">
      <div className="p-4 border-b border-cyan-500/20">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-cyan-400" />
          <span className="text-lg font-bold text-cyan-400 cyber-glow-text">
            DARKNET
          </span>
        </Link>
      </div>

      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border border-cyan-500/50">
            <AvatarFallback className="bg-cyan-500/10 text-cyan-400">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{username}</p>
            <p className="text-xs text-muted-foreground">在线</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-yellow-400">货币</span>
            <span className="font-mono">{balance.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-red-400">健康</span>
            <span className="font-mono">{health}/100</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-400">体力</span>
            <span className="font-mono">{stamina}/100</span>
          </div>
          <div className="flex justify-between text-xs pt-1 mt-1 border-t border-cyan-500/10">
            <span className="flex items-center gap-1 text-cyan-400">
              <Calendar className="w-3 h-3" />
              游戏日
            </span>
            <span className="font-mono text-cyan-400 cyber-glow-text">
              Day {gameDay}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-cyan-500/20 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 mb-1"
          onClick={handleSkipDay}
          disabled={skipping}
        >
          {skipping ? (
            <Loader2 className="w-4 h-4 mr-3 animate-spin" />
          ) : (
            <FastForward className="w-4 h-4 mr-3" />
          )}
          {skipping ? "推进中..." : "跳过游戏日"}
        </Button>

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/profile" || pathname.startsWith("/profile/")
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
          )}
        >
          <User className="w-4 h-4" />
          <span>个人资料</span>
        </Link>
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/notifications" ||
              pathname.startsWith("/notifications/")
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
          )}
        >
          <Bell className="w-4 h-4" />
          <span>通知</span>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-red-400"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="w-4 h-4 mr-3" />
          退出登录
        </Button>
      </div>
    </div>
  );
}
