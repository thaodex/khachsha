import { useState } from "react";
import { Hotel, LogIn, BedDouble, Sparkles, BarChart3, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { HOTEL_NAME, ROLE_LABELS, useStore } from "../lib/store";
import { toast } from "sonner";
import { Tilt3D } from "./Tilt3D";

const QUICK = [
  { role: "admin", username: "admin", password: "admin" },
  { role: "reception", username: "letan", password: "letan" },
  { role: "accountant", username: "ketoan", password: "ketoan" },
] as const;

const HIGHLIGHTS = [
  { icon: BedDouble, title: "Quản lý phòng trực quan", desc: "Lịch phòng dạng grid, chặn trùng lịch tự động." },
  { icon: BarChart3, title: "Thống kê doanh thu", desc: "Công suất & doanh thu theo ngày/tuần/tháng." },
  { icon: Sparkles, title: "Trợ lý AI tích hợp", desc: "Tư vấn phòng, soạn email, gợi ý khuyến mãi." },
];

export function Login({ onBack }: { onBack?: () => void }) {
  const { login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = login(username.trim(), password.trim());
    if (u) toast.success(`Xin chào ${u.name}`);
    else toast.error("Sai tài khoản hoặc mật khẩu.");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-sidebar text-sidebar-foreground">
        {/* Gradient mesh backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="orb absolute -top-24 -left-24 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="orb absolute top-1/3 -right-24 size-96 rounded-full bg-white/5 blur-3xl" style={{ animationDelay: "-4s" }} />
          <div className="orb absolute -bottom-32 left-1/4 size-96 rounded-full bg-white/5 blur-3xl" style={{ animationDelay: "-8s" }} />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
        </div>

        <div className="relative flex items-center gap-3 text-white">
          <div className="grid place-items-center size-11 rounded-2xl bg-white text-sidebar shadow-lg">
            <Hotel className="size-6" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">{HOTEL_NAME}</div>
            <div className="text-xs opacity-70">Hotel Management Suite</div>
          </div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur mb-5">
            <Sparkles className="size-3.5 text-white" /> Tích hợp AI cho khách sạn vừa & nhỏ
          </div>
          <h1 className="text-white text-4xl leading-[1.15] font-semibold max-w-md">
            Vận hành khách sạn của bạn, gọn gàng và thông minh.
          </h1>
          <div className="mt-8 space-y-4 max-w-md">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-start gap-3">
                  <div className="grid place-items-center size-10 shrink-0 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                    <Icon className="size-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{h.title}</div>
                    <div className="text-sm opacity-70">{h.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-sm opacity-50">© 2026 {HOTEL_NAME}. Dùng nội bộ.</p>
      </div>

      {/* Right form panel */}
      <div className="relative flex items-center justify-center p-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Quay lại trang đặt phòng
          </button>
        )}
        <div className="w-full max-w-md">
          <Tilt3D max={4} scale={1.008}>
          <div className="rounded-2xl border bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/60 p-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="grid place-items-center size-10 rounded-2xl bg-foreground text-background shadow">
                <Hotel className="size-5" />
              </div>
              <span className="font-semibold">{HOTEL_NAME}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs mb-3">
              <ShieldCheck className="size-3.5" /> Cổng đăng nhập nội bộ
            </div>
            <h2 className="text-2xl">Chào mừng trở lại 👋</h2>
            <p className="text-muted-foreground text-sm mt-1">Đăng nhập để tiếp tục quản lý khách sạn.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="u">Tài khoản</Label>
                <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p">Mật khẩu</Label>
                <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11">
                <LogIn className="size-4" /> Đăng nhập
              </Button>
            </form>

            <div className="mt-6">
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="h-px flex-1 bg-border" /> Tài khoản demo <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.role}
                    type="button"
                    onClick={() => { setUsername(q.username); setPassword(q.password); }}
                    className="group rounded-xl border p-2.5 text-xs text-left hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="font-medium group-hover:text-primary transition-colors">{ROLE_LABELS[q.role]}</div>
                    <div className="text-muted-foreground">{q.username}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          </Tilt3D>
        </div>
      </div>
    </div>
  );
}
