import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Clock, Shield, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">系统设置</h1>
        <p className="text-muted-foreground">
          配置游戏全局参数与系统行为。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-400" />
              结算周期设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">每日结算时间</span>
                <span className="font-mono">00:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">价格波动周期</span>
                <span className="font-mono">每小时</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">体力恢复周期</span>
                <span className="font-mono">每10分钟</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              安全设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">API 请求限流</span>
                <span className="font-mono">60次/分钟</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">密码哈希强度</span>
                <span className="font-mono">bcrypt cost=12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Redis 分布式锁</span>
                <span className="text-green-400">已启用</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
