import { useState } from "react";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { useStore } from "../../lib/store";
import { toast } from "sonner";

/**
 * Form đăng nhập / đăng ký dành cho KHÁCH (role "guest").
 * Dùng inline trong flow đặt phòng hoặc trong GuestAuthDialog.
 */
export function GuestAuthForm({ onDone, onStaffLogin }: { onDone?: () => void; onStaffLogin?: () => void }) {
  const { login, registerGuest } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  // login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // register
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length !== 10) {
      toast.error("Số điện thoại phải có đúng 10 chữ số.");
      return;
    }
    const u = login(username.trim(), password);
    if (u) {
      toast.success(`Xin chào ${u.name}!`);
      onDone?.();
    } else toast.error("Sai số điện thoại hoặc mật khẩu.");
  };

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.error("Số điện thoại phải có đúng 10 chữ số.");
      return;
    }
    const res = registerGuest({ name, phone, email, password: regPassword });
    if (res.ok) {
      toast.success(res.message);
      onDone?.();
    } else toast.error(res.message);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-1.5 transition-all ${mode === "login" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-1.5 transition-all ${mode === "register" ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
        >
          Đăng ký
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={submitLogin} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="g-u">Số điện thoại</Label>
            <Input
              id="g-u"
              type="tel"
              value={username}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 10) setUsername(val);
              }}
              placeholder="0901 234 567"
              autoFocus
              required
              minLength={10}
              maxLength={10}
              pattern="[0-9]{10}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-p">Mật khẩu</Label>
            <Input id="g-p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">
            <LogIn className="size-4" /> Đăng nhập
          </Button>

        </form>
      ) : (
        <form onSubmit={submitRegister} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="r-n">Họ tên</Label>
            <Input id="r-n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-p">Số điện thoại</Label>
              <Input
                id="r-p"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) setPhone(val);
                }}
                placeholder="09xx xxx xxx"
                required
                minLength={10}
                maxLength={10}
                pattern="[0-9]{10}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-e">Email (không bắt buộc)</Label>
              <Input id="r-e" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-pw">Mật khẩu</Label>
            <Input id="r-pw" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự" minLength={8} required autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full">
            <UserPlus className="size-4" /> Tạo tài khoản & tiếp tục
          </Button>
        </form>
      )}

      {onStaffLogin && (
        <div className="border-t pt-3 text-center text-xs text-muted-foreground">
          Bạn là nhân viên?{" "}
          <button
            type="button"
            onClick={onStaffLogin}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ShieldCheck className="size-3.5" /> Đăng nhập nội bộ
          </button>
        </div>
      )}
    </div>
  );
}

export function GuestAuthDialog({ open, onClose, onStaffLogin }: {
  open: boolean;
  onClose: () => void;
  onStaffLogin?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tài khoản khách</DialogTitle>
          <DialogDescription>
            Đăng nhập hoặc tạo tài khoản để đặt phòng và theo dõi yêu cầu của bạn.
          </DialogDescription>
        </DialogHeader>
        <GuestAuthForm onDone={onClose} onStaffLogin={onStaffLogin} />
      </DialogContent>
    </Dialog>
  );
}
