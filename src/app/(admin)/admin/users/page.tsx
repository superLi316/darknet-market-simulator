import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">玩家管理</h1>
        <p className="text-muted-foreground">
          查看和管理所有玩家账号，执行干预操作。
        </p>
      </div>

      <Card className="border-red-500/20 bg-card/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-red-400" />
              玩家列表
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户名..."
                  className="pl-9 w-64 bg-background"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">玩家管理功能开发中</p>
            <p className="text-sm">支持按用户名、性格、状态筛选与排序</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
