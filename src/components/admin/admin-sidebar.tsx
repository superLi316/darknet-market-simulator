"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Settings,
  Shield,
  Bell,
  LogOut,
  Terminal,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "数据大盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "玩家管理", icon: Users },
  { href: "/admin/economy", label: "经济调控", icon: TrendingUp },
  { href: "/admin/events", label: "系统事件", icon: Bell },
  { href: "/admin/audit", label: "审计日志", icon: FileText },
  { href: "/admin/settings", label: "系统设置", icon: Settings },
];

interface AdminSidebarProps {
  username: string;
}

export function AdminSidebar({ username }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col border-r border-red-500/20 bg-card/50 backdrop-blur-sm w-64">
      <div className="p-4 border-b border-red-500/20">
        <Link href="/admin" className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-400" />
          <span className="text-lg font-bold text-red-400">ADMIN PANEL</span>
        </Link>
      </div>

      <div className="p-4 border-b border-red-500/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-red-500/50">
            <AvatarFallback className="bg-red-500/10 text-red-400">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{username}</p>
            <p className="text-xs text-red-400">管理员</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-red-500/20">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors mb-1"
        >
          <Terminal className="w-4 h-4" />
          <span>返回玩家端</span>
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
