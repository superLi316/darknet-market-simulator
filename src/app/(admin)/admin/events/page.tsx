import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Zap, AlertTriangle, Gift, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

const eventTypes = [
  { type: "PRICE_SURGE", name: "价格暴涨", icon: Zap, color: "text-yellow-400", desc: "指定商品价格大幅上涨" },
  { type: "TRADE_FREEZE", name: "交易冻结", icon: AlertTriangle, color: "text-red-400", desc: "暂停所有交易活动" },
  { type: "BONUS", name: "全局补贴", icon: Gift, color: "text-green-400", desc: "向所有玩家发放货币补贴" },
  { type: "FAMINE", name: "物资饥荒", icon: Skull, color: "text-orange-400", desc: "食物和水价格飞涨" },
];

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">系统事件</h1>
          <p className="text-muted-foreground">
            发布全局或定向系统事件，影响游戏经济与玩家行为。
          </p>
        </div>
        <Button className="bg-red-500 hover:bg-red-600">
          <Bell className="w-4 h-4 mr-2" />
          发布新事件
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {eventTypes.map((event) => {
          const Icon = event.icon;
          return (
            <Card
              key={event.type}
              className="border-red-500/20 bg-card/50 hover:border-red-500/40 transition-all cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background/50`}>
                    <Icon className={`w-5 h-5 ${event.color}`} />
                  </div>
                  <CardTitle className="text-md">{event.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{event.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-red-500/20 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">活跃事件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p>暂无活跃事件</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
