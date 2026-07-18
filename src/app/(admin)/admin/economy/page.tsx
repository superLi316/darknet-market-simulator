import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Coins, Briefcase } from "lucide-react";

export default function AdminEconomyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">经济调控</h1>
        <p className="text-muted-foreground">
          宏观调控游戏经济，调整商品价格与劳动报酬。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              商品价格调整
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>功能开发中</p>
              <p className="text-sm">调整基础价格、最低价格、最高价格</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-yellow-400" />
              劳动报酬调整
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>功能开发中</p>
              <p className="text-sm">修改各劳动类型的基础报酬</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
