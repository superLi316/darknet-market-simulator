import Link from "next/link";
import { Terminal } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid-bg">
      <div className="absolute inset-0 bg-cyber-glow pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Terminal className="w-10 h-10 text-cyan-400" />
            <span className="text-2xl font-bold tracking-wider text-cyan-400 cyber-glow-text">
              DARKNET
            </span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">系统登录</h1>
          <p className="text-muted-foreground">输入你的凭据接入地下网络</p>
        </div>

        <div className="p-6 rounded-lg border border-cyan-500/30 bg-card/80 backdrop-blur-sm shadow-neon-cyan">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          还没有账号？{" "}
          <Link href="/register" className="text-cyan-400 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
