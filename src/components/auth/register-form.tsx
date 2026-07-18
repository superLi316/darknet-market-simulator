"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

const PERSONALITY_INFO = {
  HARDWORKING: { name: "勤奋型", desc: "劳动收益 +30%，体力消耗 +20%", color: "text-cyan-400" },
  LAZY: { name: "懒惰型", desc: "劳动收益 -20%，物资消耗 -50%", color: "text-green-400" },
  SPECULATOR: { name: "投机型", desc: "倒卖利润 +25%，劳动收益 -20%", color: "text-yellow-400" },
  CAUTIOUS: { name: "谨慎型", desc: "可查看精确价格趋势与历史走势", color: "text-blue-400" },
  CRAZY: { name: "疯狂型", desc: "收益在 ±50% 随机，每日 5% 概率清空物资", color: "text-red-400" },
};

export function RegisterForm() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedPersonality, setAssignedPersonality] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "personality">("form");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码长度至少为 6 位");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "注册失败");
        return;
      }

      setAssignedPersonality(data.personality);
      setStep("personality");
    } catch {
      setError("注册时发生错误，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmAndLogin() {
    setIsLoading(true);
    try {
      await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("自动登录失败，请手动登录");
      setStep("form");
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "personality" && assignedPersonality) {
    const info = PERSONALITY_INFO[assignedPersonality as keyof typeof PERSONALITY_INFO];
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-yellow-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">你的性格已确定</h2>
          <p className="text-muted-foreground text-sm">系统根据你的数字指纹分配了性格类型</p>
        </div>

        <div className="p-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <p className={`text-2xl font-bold ${info.color} mb-2`}>{info.name}</p>
          <p className="text-sm text-muted-foreground">{info.desc}</p>
        </div>

        <Button
          onClick={handleConfirmAndLogin}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              进入系统...
            </>
          ) : (
            "确认并进入暗网"
          )}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="输入用户名（3-20 字符）"
          required
          disabled={isLoading}
          className="bg-background"
          minLength={3}
          maxLength={20}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">邮箱（可选）</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="输入邮箱地址"
          disabled={isLoading}
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 6 位密码"
          required
          disabled={isLoading}
          className="bg-background"
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认密码</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="再次输入密码"
          required
          disabled={isLoading}
          className="bg-background"
          minLength={6}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-magenta-500 hover:bg-magenta-600 text-black font-bold"
        disabled={isLoading}
        style={{ backgroundColor: "#ff00ff", color: "#000" }}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            创建身份中...
          </>
        ) : (
          "创建身份"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        注册即表示系统将随机分配你的性格类型，该决定不可逆
      </p>
    </form>
  );
}
