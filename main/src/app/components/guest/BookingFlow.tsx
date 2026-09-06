import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ClipboardList, Clock, PartyPopper, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { DEPOSIT_PERCENT, useStore } from "../../lib/store";
import { Booking, RoomHold, RoomType } from "../../lib/types";
import { formatDate, formatVND, toISODate } from "../../lib/format";
import { formatRemaining } from "../../lib/holds";
import { RoomPreview } from "./RoomPreview";
import { GuestAuthForm } from "./GuestAuth";
import { DepositPanel } from "./DepositDialog";
import { toast } from "sonner";

type Step = "auth" | "confirm" | "deposit" | "done";

const STEP_META: Record<Step, (t: RoomType, ci: string, co: string, n: number, g: number) => { title: string; desc: string }> = {
  auth: (t, ci, co) => ({
    title: "Đăng nhập để đặt phòng",
    desc: `Phòng ${t.name} · ${formatDate(ci)} → ${formatDate(co)}`,
  }),
  confirm: (t, ci, co, n, g) => ({
    title: `Xác nhận đặt phòng ${t.name}`,
    desc: `${formatDate(ci)} → ${formatDate(co)} · ${n} đêm · ${g} khách`,
  }),
  deposit: () => ({
    title: "Đặt cọc giữ phòng",
    desc: `Cọc ${Math.round(DEPOSIT_PERCENT * 100)}% để giữ phòng — phần còn lại thanh toán tại khách sạn.`,
  }),
  done: () => ({
    title: "Đặt phòng thành công!",
    desc: "Yêu cầu của bạn đã được ghi nhận.",
  }),
};

/**
 * Flow đặt phòng của khách:
 * chọn phòng → [đăng nhập/đăng ký nếu chưa] → giữ phòng tạm 15 phút + xác nhận → cọc → hoàn tất.
 * Hold chống 2 khách cùng chốt 1 phòng trong lúc đang nhập thông tin.
 */
export function BookingFlow({ type, roomId, checkIn, checkOut, guests, nights, onClose, onViewBookings, onOpenLegal }: {
  type: RoomType;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  onClose: () => void;
  onViewBookings?: () => void;
  onOpenLegal?: () => void;
}) {
  const { currentUser, customers, saveCustomer, createBookingSafe, holdRoom, dropHold, quoteFor } = useStore();
  const [step, setStep] = useState<Step>(currentUser ? "confirm" : "auth");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paid, setPaid] = useState(false);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [note, setNote] = useState("");

  const [hold, setHold] = useState<RoomHold | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const consumedRef = useRef(false);
  const submitLock = useRef(false);
  const holdRef = useRef<RoomHold | null>(null);

  // Đăng nhập/đăng ký xong → tự điền thông tin tài khoản vào bước xác nhận
  useEffect(() => {
    if (currentUser) {
      setName((v) => v || currentUser.name);
      setPhone((v) => v || currentUser.phone || "");
      setEmail((v) => v || currentUser.email || "");
    }
  }, [currentUser]);

  // Vào bước xác nhận → giữ phòng tạm thời
  useEffect(() => {
    if (step !== "confirm" || hold || holdError) return;
    const res = holdRoom({ roomId, checkIn, checkOut, guests, customerId: currentUser?.customerId });
    if (res.ok && res.hold) { holdRef.current = res.hold; setHold(res.hold); }
    else setHoldError(res.message);
  }, [step, hold, holdError, holdRoom, roomId, checkIn, checkOut, guests, currentUser]);

  // Đếm ngược thời gian giữ phòng
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const ms = new Date(hold.expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) {
        setHold(null);
        setHoldError("Hết thời gian giữ phòng. Bạn cần chọn lại để đảm bảo phòng còn trống.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);

  // Đóng dialog mà chưa chốt → nhả phòng ngay cho khách khác
  const releaseIfUnused = useCallback(() => {
    if (holdRef.current && !consumedRef.current) {
      dropHold(holdRef.current.id);
      holdRef.current = null;
    }
  }, [dropHold]);

  useEffect(() => () => releaseIfUnused(), [releaseIfUnused]);

  const quote = quoteFor(type.id, checkIn, checkOut);
  const total = quote ? quote.total : type.basePrice * nights;
  const baseTotal = quote ? quote.baseTotal : total;
  const deposit = Math.round(total * DEPOSIT_PERCENT);
  const meta = STEP_META[step](type, checkIn, checkOut, nights, guests);

  const submit = async () => {
    if (!name.trim()) return toast.error("Vui lòng nhập họ tên.");
    if (!phone.trim()) return toast.error("Vui lòng nhập số điện thoại.");
    if (!/^[+\d][\d\s().-]{7,19}$/.test(phone.trim())) return toast.error("Số điện thoại chưa hợp lệ.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("Email chưa hợp lệ.");
    if (!hold || holdError || new Date(hold.expiresAt).getTime() <= Date.now()) return toast.error("Vui lòng chọn lại phòng để giữ chỗ.");
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      // Ưu tiên hồ sơ khách gắn với tài khoản; nếu không có thì tìm theo SĐT
      const existing = currentUser?.customerId
        ? customers.find((c) => c.id === currentUser.customerId)
        : customers.find((c) => c.phone.trim() === phone.trim());
      const cust = saveCustomer({
        id: existing?.id ?? "",
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        idNumber: existing?.idNumber ?? "",
        address: existing?.address ?? "",
        createdAt: existing?.createdAt ?? toISODate(new Date()),
      });
      const res = await createBookingSafe({
        roomId, customerId: cust.id, checkIn, checkOut, guests,
        note: note.trim() || undefined, status: "pending", source: "website",
        holdId: hold?.id,
        idempotencyKey: `web-${cust.id}-${roomId}-${checkIn}-${checkOut}`,
      });
      if (res.ok && res.booking) {
        consumedRef.current = true;
        setBooking(res.booking);
        setStep("deposit");
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu đặt phòng. Vui lòng thử lại.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) { releaseIfUnused(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg booking-dialog">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>{meta.desc}</DialogDescription>
        </DialogHeader>

        {step === "auth" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              Phòng <b>{type.name}</b> · {nights} đêm ·{" "}
              <b className="text-primary">{formatVND(total)}</b>
            </div>
            <GuestAuthForm onDone={() => setStep("confirm")} />
          </div>
        )}

        {step === "confirm" && (
          <div className="grid gap-4 py-2">
            <div className="booking-preview"><RoomPreview type={type} image={type.image || "/media/room-deluxe.webp"} /></div>
            {/* Trạng thái giữ phòng */}
            {hold && remaining > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Clock className="size-4 shrink-0" />
                <span>
                  Phòng đang được giữ cho bạn — còn{" "}
                  <b className="tabular-nums">{formatRemaining(remaining)}</b> để hoàn tất.
                </span>
              </div>
            )}
            {holdError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  {holdError}
                  <div className="mt-0.5 text-xs">
                    Vui lòng đóng hộp thoại và chọn lại phòng trước khi tiếp tục.
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="booking-name">Họ tên</Label>
                <Input id="booking-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-phone">Số điện thoại</Label>
                <Input id="booking-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-email">Email</Label>
                <Input id="booking-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@…" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-note">Yêu cầu đặc biệt</Label>
              <Textarea id="booking-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Phòng tầng cao, giường đôi…" />
            </div>

            {/* Chi tiết giá — có giải thích khi giá khác giá niêm yết */}
            <div className="space-y-1.5 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span>{nights} đêm · {quote ? formatVND(quote.avgPerNight) + "/đêm" : formatVND(type.basePrice) + "/đêm"}</span>
                <span className="font-medium">{formatVND(total)}</span>
              </div>
              {quote && Math.abs(quote.deltaPercent) >= 1 && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  {quote.deltaPercent > 0 ? (
                    <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  ) : (
                    <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  )}
                  <span>
                    Giá niêm yết {formatVND(baseTotal)} ·{" "}
                    {quote.deltaPercent > 0
                      ? `tăng ${quote.deltaPercent}% do cao điểm / cuối tuần`
                      : `giảm ${Math.abs(quote.deltaPercent)}% do thấp điểm`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Cọc giữ phòng ({Math.round(DEPOSIT_PERCENT * 100)}%) — ở bước tiếp theo</span>
                <span>{formatVND(deposit)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Thanh toán tại khách sạn</span>
                <span>{formatVND(total - deposit)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { releaseIfUnused(); onClose(); }}>Hủy</Button>
              <Button onClick={() => void submit()} disabled={submitting || !hold || !!holdError || remaining <= 0}>
                <Check className="size-4" /> {submitting ? "Đang lưu…" : "Xác nhận đặt phòng"}
              </Button>
            </div>
          </div>
        )}

        {step === "deposit" && booking && (
          <div className="space-y-3">
            <DepositPanel
              booking={booking}
              onOpenLegal={onOpenLegal}
              onPaid={() => {
                setPaid(true);
                setStep("done");
                if (email || phone) {
                  toast.info("Biên nhận mô phỏng được lưu trên thiết bị; chưa gửi email/SMS thật.");
                }
              }}
            />
            <button
              type="button"
              onClick={() => setStep("done")}
              className="mx-auto block text-xs text-muted-foreground hover:underline"
            >
              Để cọc sau — phòng chưa được giữ cho đến khi cọc
            </button>
          </div>
        )}

        {step === "done" && booking && (
          <div className="space-y-4 py-4 text-center">
            <PartyPopper className="mx-auto size-12 text-primary" />
            <div>
              <div className="font-semibold">Mã đặt phòng: {booking.code}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {paid
                  ? "Tiền cọc đã được ghi nhận — phòng đang được giữ cho bạn. Lễ tân sẽ sớm xác nhận."
                  : "Yêu cầu đã được ghi nhận. Bạn có thể cọc giữ phòng bất cứ lúc nào trong mục \"Đặt phòng của tôi\"."}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {onViewBookings && (
                <Button variant="outline" onClick={() => { onClose(); onViewBookings(); }}>
                  <ClipboardList className="size-4" /> Đặt phòng của tôi
                </Button>
              )}
              <Button onClick={onClose}>Hoàn tất</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
