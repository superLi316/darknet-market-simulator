"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Coins,
  Heart,
  Zap,
  Calendar,
  Skull,
  Lock,
  LogOut,
  Image as ImageIcon,
  ArrowLeftRight,
  LineChart,
  Key,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Check,
  AlertCircle,
  Upload,
  Link as LinkIcon,
  Grid3X3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

// ============ 常量配置 ============

const PERSONALITY_INFO: Record<string, { name: string; desc: string; color: string }> = {
  HARDWORKING: { name: "勤奋型", desc: "劳动收益 +30%，体力消耗 +20%", color: "text-cyan-400" },
  LAZY: { name: "懒惰型", desc: "劳动收益 -20%，物资消耗 -50%", color: "text-green-400" },
  SPECULATOR: { name: "投机型", desc: "倒卖利润 +25%，劳动收益 -20%", color: "text-yellow-400" },
  CAUTIOUS: { name: "谨慎型", desc: "可查看精确价格趋势与历史走势", color: "text-blue-400" },
  CRAZY: { name: "疯狂型", desc: "收益在 ±50% 随机，每日 5% 概率清空物资", color: "text-red-400" },
};

const STATUS_NAMES: Record<string, { name: string; color: string }> = {
  ALIVE: { name: "存活", color: "text-green-400" },
  DEAD: { name: "死亡", color: "text-red-400" },
  BANNED: { name: "封禁", color: "text-yellow-400" },
  SUSPENDED: { name: "暂停", color: "text-blue-400" },
};

const TRANSACTION_TYPES: Record<string, { name: string; color: string }> = {
  BUY: { name: "买入", color: "text-red-400" },
  SELL: { name: "卖出", color: "text-green-400" },
  CONSUME: { name: "消耗", color: "text-yellow-400" },
};

// 判断头像是否为自定义图片（URL 或 base64）
function isCustomImage(avatar: string | null): boolean {
  if (!avatar) return false;
  return avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("data:image/");
}

// 判断是否为预设头像
function isPresetAvatar(avatar: string | null): boolean {
  if (!avatar) return false;
  return /^avatar([1-9]|1[0-9]|20)$/.test(avatar);
}

// 20 个预设头像：emoji + 渐变背景色
const AVATARS = [
  { id: "avatar1", emoji: "🤖", gradient: "from-cyan-500 to-blue-600" },
  { id: "avatar2", emoji: "👤", gradient: "from-purple-500 to-pink-600" },
  { id: "avatar3", emoji: "👾", gradient: "from-green-500 to-emerald-600" },
  { id: "avatar4", emoji: "🎭", gradient: "from-red-500 to-orange-600" },
  { id: "avatar5", emoji: "🦊", gradient: "from-orange-500 to-amber-600" },
  { id: "avatar6", emoji: "🐉", gradient: "from-indigo-500 to-purple-600" },
  { id: "avatar7", emoji: "🐺", gradient: "from-slate-500 to-gray-700" },
  { id: "avatar8", emoji: "🦅", gradient: "from-sky-500 to-cyan-600" },
  { id: "avatar9", emoji: "🐍", gradient: "from-lime-500 to-green-600" },
  { id: "avatar10", emoji: "🦂", gradient: "from-amber-500 to-red-600" },
  { id: "avatar11", emoji: "🦈", gradient: "from-blue-500 to-indigo-600" },
  { id: "avatar12", emoji: "💀", gradient: "from-gray-600 to-slate-800" },
  { id: "avatar13", emoji: "👹", gradient: "from-red-600 to-rose-800" },
  { id: "avatar14", emoji: "🤡", gradient: "from-fuchsia-500 to-purple-700" },
  { id: "avatar15", emoji: "🧙", gradient: "from-violet-500 to-indigo-700" },
  { id: "avatar16", emoji: "🧛", gradient: "from-rose-700 to-red-900" },
  { id: "avatar17", emoji: "🧟", gradient: "from-green-700 to-lime-900" },
  { id: "avatar18", emoji: "🦾", gradient: "from-teal-500 to-cyan-700" },
  { id: "avatar19", emoji: "🦿", gradient: "from-yellow-500 to-orange-700" },
  { id: "avatar20", emoji: "⚡", gradient: "from-cyan-400 to-purple-600" },
];

// ============ 类型定义 ============

interface UserData {
  id: string;
  username: string;
  email?: string;
  role: string;
  status: string;
  personality: string;
  balance: number;
  health: number;
  stamina: number;
  maxStamina: number;
  survivalDays: number;
  smallTrophies: number;
  largeTrophies: number;
  totalEarned: number;
  totalSpent: number;
  totalProfit: number;
  tradeCount: number;
  workCount: number;
  createdAt: string;
  avatar: string | null;
  gameDay: number;
  deathCount: number;
  diedAt: string | null;
  deathReason: string | null;
}

interface Transaction {
  id: string;
  userId: string;
  itemId: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  profitLoss: number | null;
  timestamp: string;
  item: {
    id: string;
    name: string;
    category: string;
  };
}

interface TransactionResponse {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

interface AssetRecord {
  id: string;
  gameDay: number;
  balance: number;
  inventoryValue: number;
  totalAssets: number;
  earned: number;
  spent: number;
  recordedAt: string;
}

type TabId = "profile" | "avatar" | "transactions" | "assets" | "password";

// ============ 主组件 ============

export function ProfilePageClient() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setUser(data.data);
      } else {
        toast({
          title: "加载失败",
          description: data.message || "无法获取用户信息",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[PROFILE_LOAD_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-muted-foreground">无法加载用户信息</p>
        <Button onClick={loadUser} variant="outline" className="mt-4">
          重新加载
        </Button>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "avatar", label: "更换头像", icon: ImageIcon },
    { id: "transactions", label: "交易记录", icon: ArrowLeftRight },
    { id: "assets", label: "资产变化", icon: LineChart },
    { id: "password", label: "更改密码", icon: Key },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2 cyber-glow-text text-cyan-400">
            个人资料
          </h1>
          <p className="text-muted-foreground">
            管理你的账户、头像、查看交易与资产历史。
          </p>
        </div>
        <Button
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>
      </div>

      {/* 标签页导航 */}
      <div className="flex flex-wrap gap-2 border-b border-cyan-500/20 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 cyber-glow-text"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10 border border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 标签内容 */}
      {activeTab === "profile" && <ProfileTab user={user} />}
      {activeTab === "avatar" && (
        <AvatarTab
          currentAvatar={user.avatar}
          onAvatarChanged={(avatar) => setUser({ ...user, avatar })}
        />
      )}
      {activeTab === "transactions" && <TransactionsTab />}
      {activeTab === "assets" && <AssetsTab />}
      {activeTab === "password" && <PasswordTab />}
    </div>
  );
}

// ============ 个人资料标签 ============

function ProfileTab({ user }: { user: UserData }) {
  const personality = PERSONALITY_INFO[user.personality] || {
    name: user.personality,
    desc: "",
    color: "text-muted-foreground",
  };
  const status = STATUS_NAMES[user.status] || {
    name: user.status,
    color: "text-muted-foreground",
  };
  const avatarInfo = AVATARS.find((a) => a.id === user.avatar);
  const customImg = isCustomImage(user.avatar);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-cyan-500/20 bg-card/50 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">角色信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-3xl border border-cyan-500/30 overflow-hidden",
                !customImg && avatarInfo
                  ? `bg-gradient-to-br ${avatarInfo.gradient}`
                  : "bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
              )}
            >
              {customImg ? (
                <img
                  src={user.avatar!}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : avatarInfo ? (
                avatarInfo.emoji
              ) : (
                <User className="w-8 h-8 text-cyan-400" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold">{user.username}</p>
              <p className={cn("text-sm", status.color)}>{status.name}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-cyan-500/20 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">性格类型</span>
              <span className={personality.color}>{personality.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{personality.desc}</p>
          </div>

          <div className="pt-4 border-t border-cyan-500/20 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">注册时间</span>
            </div>
            <p className="font-mono text-sm">
              {new Date(user.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>

          <div className="pt-4 border-t border-cyan-500/20 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-muted-foreground">当前游戏日</span>
            </div>
            <p className="font-mono text-lg text-cyan-400">Game Day {user.gameDay}</p>
          </div>

          {user.diedAt && (
            <div className="pt-4 border-t border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Skull className="w-4 h-4 text-red-400" />
                <span className="text-red-400">死亡记录</span>
              </div>
              <p className="text-sm text-muted-foreground">
                死亡次数: {user.deathCount}
              </p>
              {user.deathReason && (
                <p className="text-sm text-muted-foreground">死因: {user.deathReason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-cyan-500/20 bg-card/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">游戏统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="当前货币"
              value={user.balance.toFixed(0)}
              icon={Coins}
              color="text-yellow-400"
            />
            <StatCard
              label="健康值"
              value={`${user.health}/100`}
              icon={Heart}
              color="text-red-400"
            />
            <StatCard
              label="体力值"
              value={`${user.stamina}/${user.maxStamina}`}
              icon={Zap}
              color="text-green-400"
            />
            <StatCard label="累计收入" value={user.totalEarned.toFixed(0)} />
            <StatCard label="累计支出" value={user.totalSpent.toFixed(0)} />
            <StatCard label="交易利润" value={user.totalProfit.toFixed(0)} />
            <StatCard label="交易笔数" value={String(user.tradeCount)} />
            <StatCard label="劳动次数" value={String(user.workCount)} />
            <StatCard label="生存天数" value={String(user.survivalDays)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  icon?: typeof Coins;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-background/50 border border-cyan-500/10">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {Icon && <Icon className={cn("w-4 h-4", color)} />}
        {label}
      </div>
      <p className={cn("text-xl font-mono", color)}>{value}</p>
    </div>
  );
}

// ============ 头像标签 ============

function AvatarTab({
  currentAvatar,
  onAvatarChanged,
}: {
  currentAvatar: string | null;
  onAvatarChanged: (avatar: string) => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(currentAvatar);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"preset" | "url" | "upload">("preset");
  const [urlInput, setUrlInput] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);

  useEffect(() => {
    setSelected(currentAvatar);
  }, [currentAvatar]);

  async function handleSave() {
    const avatarToSave = mode === "preset" ? selected : mode === "url" ? urlInput : uploadBase64;
    if (!avatarToSave) {
      toast({
        title: "请选择头像",
        description: "请先选择或上传一个头像再保存",
        variant: "destructive",
      });
      return;
    }
    if (avatarToSave === currentAvatar) {
      toast({
        title: "无需更改",
        description: "当前头像已是所选头像",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarToSave }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast({
          title: "更换成功",
          description: "头像已更新",
        });
        onAvatarChanged(avatarToSave);
        setSelected(avatarToSave);
      } else {
        toast({
          title: "更换失败",
          description: data.message || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[AVATAR_SAVE_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "文件格式错误", description: "请选择图片文件", variant: "destructive" });
      return;
    }
    if (file.size > 500 * 1024) {
      toast({ title: "文件过大", description: "图片大小不能超过 500KB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadPreview(base64);
      setUploadBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  function renderCurrentAvatar() {
    if (currentAvatar) {
      if (isCustomImage(currentAvatar)) {
        return (
          <img
            src={currentAvatar}
            alt="avatar"
            className="w-full h-full object-cover rounded-full"
          />
        );
      }
      const info = AVATARS.find((a) => a.id === currentAvatar);
      if (info) return info.emoji;
    }
    return <User className="w-10 h-10 text-cyan-400" />;
  }

  function renderCurrentAvatarBg() {
    if (currentAvatar && isCustomImage(currentAvatar)) {
      return "from-cyan-500/20 to-purple-500/20";
    }
    const info = AVATARS.find((a) => a.id === currentAvatar);
    return info ? info.gradient : "from-cyan-500/20 to-purple-500/20";
  }

  const currentInfo = AVATARS.find((a) => a.id === currentAvatar);

  return (
    <Card className="border-cyan-500/20 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-cyan-400" />
          更换头像
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 当前头像预览 */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-cyan-500/10">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center text-4xl border border-cyan-500/30 bg-gradient-to-br overflow-hidden",
              renderCurrentAvatarBg()
            )}
          >
            {renderCurrentAvatar()}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">当前头像</p>
            <p className="font-mono text-cyan-400 text-sm break-all">
              {currentAvatar && isCustomImage(currentAvatar)
                ? "自定义图片"
                : currentAvatar || "未设置（默认）"}
            </p>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 border-b border-cyan-500/20 pb-3">
          {([
            { id: "preset" as const, label: "预设头像", icon: Grid3X3 },
            { id: "url" as const, label: "图片URL", icon: LinkIcon },
            { id: "upload" as const, label: "上传图片", icon: Upload },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all",
                mode === m.id
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        {/* 预设头像 */}
        {mode === "preset" && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              从下方 20 个预设头像中选择一个：
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {AVATARS.map((avatar) => {
                const isSelected = selected === avatar.id;
                const isCurrent = currentAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => setSelected(avatar.id)}
                    className={cn(
                      "relative aspect-square rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br transition-all",
                      avatar.gradient,
                      isSelected
                        ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-background scale-105"
                        : "opacity-80 hover:opacity-100 hover:scale-105"
                    )}
                    title={avatar.id}
                  >
                    {avatar.emoji}
                    {isCurrent && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* URL 输入 */}
        {mode === "url" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              输入图片的 URL 地址作为头像：
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/avatar.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-background/50 flex-1"
              />
            </div>
            {urlInput && (urlInput.startsWith("http://") || urlInput.startsWith("https://")) && (
              <div className="w-20 h-20 rounded-full overflow-hidden border border-cyan-500/30">
                <img
                  src={urlInput}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 上传图片 */}
        {mode === "upload" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              上传本地图片作为头像（最大 500KB）：
            </p>
            <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer hover:border-cyan-500/60 transition-colors">
              <Upload className="w-8 h-8 text-cyan-400" />
              <span className="text-sm text-muted-foreground">
                点击选择图片文件
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {uploadPreview && (
              <div className="w-20 h-20 rounded-full overflow-hidden border border-cyan-500/30">
                <img
                  src={uploadPreview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex gap-3 pt-4 border-t border-cyan-500/20">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存头像"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelected(currentAvatar);
              setUrlInput("");
              setUploadPreview(null);
              setUploadBase64(null);
            }}
            disabled={saving}
          >
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ 交易记录标签 ============

function TransactionsTab() {
  const { toast } = useToast();
  const [data, setData] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadTransactions();
  }, [page]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/transactions?page=${page}&limit=${limit}`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setData(json.data);
      } else {
        toast({
          title: "加载失败",
          description: json.message || "无法获取交易记录",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[TRANSACTIONS_LOAD_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-cyan-500/20 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          交易记录
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-50" />
            暂无交易记录
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">商品</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">类型</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">数量</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">单价</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">总额</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">盈亏</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((tx) => {
                    const typeInfo = TRANSACTION_TYPES[tx.type] || {
                      name: tx.type,
                      color: "text-muted-foreground",
                    };
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-cyan-500/10 hover:bg-cyan-500/5"
                      >
                        <td className="py-2 px-3">{tx.item?.name || "未知商品"}</td>
                        <td className={cn("py-2 px-3 font-medium", typeInfo.color)}>
                          {typeInfo.name}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{tx.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {tx.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {tx.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {tx.profitLoss !== null && tx.profitLoss !== undefined ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                tx.profitLoss >= 0 ? "text-green-400" : "text-red-400"
                              )}
                            >
                              {tx.profitLoss >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {tx.profitLoss >= 0 ? "+" : ""}
                              {tx.profitLoss.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
              <p className="text-sm text-muted-foreground">
                共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 资产变化标签 ============

function AssetsTab() {
  const { toast } = useToast();
  const [history, setHistory] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/assets");
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setHistory(json.data.history || []);
      } else {
        toast({
          title: "加载失败",
          description: json.message || "无法获取资产历史",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[ASSETS_LOAD_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // 计算图表所需的最大最小值
  const maxValue = history.length
    ? Math.max(...history.map((h) => h.totalAssets))
    : 0;
  const minValue = history.length
    ? Math.min(...history.map((h) => h.totalAssets))
    : 0;
  const range = maxValue - minValue || 1;

  return (
    <Card className="border-cyan-500/20 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LineChart className="w-5 h-5 text-cyan-400" />
          资产变化趋势
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <LineChart className="w-10 h-10 mx-auto mb-3 opacity-50" />
            暂无资产历史记录。点击侧边栏「跳过游戏日」后会生成资产快照。
          </div>
        ) : (
          <>
            {/* 总览数据 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-background/50 border border-cyan-500/10">
                <p className="text-xs text-muted-foreground mb-1">最新总资产</p>
                <p className="text-lg font-mono text-cyan-400">
                  {history[history.length - 1].totalAssets.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-cyan-500/10">
                <p className="text-xs text-muted-foreground mb-1">峰值资产</p>
                <p className="text-lg font-mono text-green-400">
                  {maxValue.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-cyan-500/10">
                <p className="text-xs text-muted-foreground mb-1">谷底资产</p>
                <p className="text-lg font-mono text-red-400">
                  {minValue.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-cyan-500/10">
                <p className="text-xs text-muted-foreground mb-1">记录天数</p>
                <p className="text-lg font-mono">{history.length}</p>
              </div>
            </div>

            {/* CSS 柱状图 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>总资产（按游戏日）</span>
                <span>
                  范围: {minValue.toFixed(0)} ~ {maxValue.toFixed(0)}
                </span>
              </div>
              <div className="relative h-64 flex items-end gap-1 p-3 bg-background/50 rounded-lg border border-cyan-500/10 overflow-x-auto">
                {history.map((record) => {
                  const heightPercent =
                    ((record.totalAssets - minValue) / range) * 80 + 10;
                  const isProfit = record.earned >= record.spent;
                  return (
                    <div
                      key={record.id}
                      className="relative flex-1 min-w-[24px] group flex flex-col items-center justify-end h-full"
                      title={`Day ${record.gameDay}: ${record.totalAssets.toFixed(0)}`}
                    >
                      <span className="text-[10px] font-mono text-muted-foreground mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {record.totalAssets.toFixed(0)}
                      </span>
                      <div
                        className={cn(
                          "w-full rounded-t transition-all",
                          isProfit
                            ? "bg-gradient-to-t from-cyan-500/60 to-cyan-400"
                            : "bg-gradient-to-t from-red-500/60 to-red-400"
                        )}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground mt-1">
                        D{record.gameDay}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-cyan-400 rounded-sm" />
                  当日盈利
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-400 rounded-sm" />
                  当日亏损
                </span>
              </div>
            </div>

            {/* 详细数据表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">游戏日</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">余额</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">库存价值</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">总资产</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">当日收入</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">当日支出</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-cyan-500/10 hover:bg-cyan-500/5"
                    >
                      <td className="py-2 px-3 font-mono text-cyan-400">
                        Day {record.gameDay}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {record.balance.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {record.inventoryValue.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-cyan-400">
                        {record.totalAssets.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-green-400">
                        +{record.earned.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-red-400">
                        -{record.spent.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 更改密码标签 ============

function PasswordTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.currentPassword) {
      newErrors.currentPassword = "请输入当前密码";
    }
    if (!form.newPassword) {
      newErrors.newPassword = "请输入新密码";
    } else if (form.newPassword.length < 6) {
      newErrors.newPassword = "新密码长度至少 6 位";
    } else if (form.newPassword.length > 64) {
      newErrors.newPassword = "新密码长度不能超过 64 位";
    } else if (form.newPassword === form.currentPassword) {
      newErrors.newPassword = "新密码不能与当前密码相同";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "请再次输入新密码";
    } else if (form.confirmPassword !== form.newPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast({
          title: "密码修改成功",
          description: "请使用新密码登录",
        });
        setForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setErrors({});
      } else {
        toast({
          title: "修改失败",
          description: data.message || "请稍后重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[PASSWORD_CHANGE_ERROR]", error);
      toast({
        title: "网络错误",
        description: "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-cyan-500/20 bg-card/50 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          更改密码
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
              className={cn(
                "bg-background/50",
                errors.currentPassword && "border-red-500/50"
              )}
            />
            {errors.currentPassword && (
              <p className="text-xs text-red-400">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className={cn(
                "bg-background/50",
                errors.newPassword && "border-red-500/50"
              )}
            />
            {errors.newPassword ? (
              <p className="text-xs text-red-400">{errors.newPassword}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                密码长度 6-64 位
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              className={cn(
                "bg-background/50",
                errors.confirmPassword && "border-red-500/50"
              )}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "确认修改"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
                setErrors({});
              }}
              disabled={saving}
            >
              清空
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProfilePageClient;
