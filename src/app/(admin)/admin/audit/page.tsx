import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">审计日志</h1>
        <p className="text-muted-foreground">
          所有管理员操作均记录在此，确保管理行为可追溯、可复盘。
        </p>
      </div>

      <Card className="border-red-500/20 bg-card/50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-400" />
              操作日志
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索操作..."
                className="pl-9 w-64 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">暂无审计记录</p>
            <p className="text-sm">所有管理员操作将自动记录在此</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
