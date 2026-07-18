import Link from "next/link";
import { Terminal } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid-bg py-10">
      <div className="absolute inset-0 bg-cyber-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Terminal className="w-10 h-10 text-cyan-400" />
            <span className="text-2xl font-bold tracking-wider text-cyan-400 cyber-glow-text">
              DARKNET
            </span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">创建身份</h1>
          <p className="text-muted-foreground">注册一个新的地下网络身份</p>
        </div>

        <div className="p-6 rounded-lg border border-magenta-500/30 bg-card/80 backdrop-blur-sm shadow-neon-magenta">
          <RegisterForm />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          已有账号？{" "}
          <Link href="/login" className="text-cyan-400 hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
