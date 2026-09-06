import { useRef, useState } from "react";
import { Building2, CheckCircle2, CreditCard, Loader2, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { DEPOSIT_PERCENT, useStore } from "../../lib/store";
import { DEMO_PAYMENTS, PAYMENT_METHOD_LABELS } from "../../lib/payments";
import { Booking, PaymentMethod } from "../../lib/types";
import { formatDate, formatVND, nightsBetween } from "../../lib/format";
import { toast } from "sonner";

/** Các cổng khách tự thanh toán được (không gồm tiền mặt — thu tại quầy). */
const GUEST_METHODS: Array<{ method: PaymentMethod; desc: string; instant: boolean }> = [
  { method: "vnpay", desc: "Thẻ ATM / Internet Banking / QR", instant: true },
  { method: "momo", desc: "Ví điện tử MoMo", instant: true },
  { method: "stripe", desc: "Thẻ quốc tế Visa / Mastercard", instant: true },
  { method: "bank_transfer", desc: "Chuyển khoản, lễ tân xác nhận thủ công", instant: false },
];

/**
 * Nội dung thanh toán CỌC GIỮ PHÒNG (20–30% giá trị đặt phòng).
 * Dùng chung cho flow đặt phòng (BookingFlow) và trang "Đặt phòng của tôi".
 */
export function DepositPanel({ booking, onPaid, onOpenLegal }: {
  booking: Booking;
  onPaid?: () => void;
  onOpenLegal?: () => void;
}) {
  const { startPayment, payDepositWithGateway, roomLabel } = useStore();
  const [method, setMethod] = useState<PaymentMethod>("vnpay");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const payLock = useRef(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = Math.max(nightsBetween(booking.checkIn, booking.checkOut), 1);
  const serviceTotal = booking.services.reduce((s, x) => s + x.price * x.qty, 0);
  const total = (booking.nightlyRates?.length ? booking.nightlyRates.reduce((s, n) => s + n.price, 0) : booking.roomPricePerNight * nights) + serviceTotal;
  const percent = Math.round((booking.depositPercent ?? DEPOSIT_PERCENT) * 100);
  const deposit = booking.depositAmount ?? Math.round(total * DEPOSIT_PERCENT);

  if (booking.depositPaid) {
    return (
      <div className="space-y-3 py-2 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <div className="font-semibold">Đã nhận tiền cọc {formatVND(booking.depositAmount ?? deposit)}</div>
        <p className="text-sm text-muted-foreground">
          Phòng đang được giữ cho bạn. Lễ tân sẽ sớm xác nhận yêu cầu {booking.code}.
        </p>
      </div>
    );
  }

  const chosen = GUEST_METHODS.find((m) => m.method === method)!;

  const pay = async () => {
    if (!DEMO_PAYMENTS || payLock.current || reported) return;
    if (!agreed) {
      setError("Bạn cần đồng ý điều khoản và chính sách hủy phòng trước khi thanh toán.");
      return;
    }
    setError(null);

    payLock.current = true;
    setBusy(true);
    try {
      if (method === "bank_transfer") {
        const result = await startPayment({ bookingId: booking.id, method, purpose: "deposit", amount: deposit });
        if (!result.ok) { setError(result.message); return; }
        setReported(true);
        toast.info("Đã lưu báo chuyển khoản mô phỏng, chờ lễ tân đối chiếu. Chưa ghi nhận đã nhận tiền.");
        return;
      }
      const res = await payDepositWithGateway(booking.id, method);
      if (res.ok) {
        toast.success(res.message);
        onPaid?.();
      } else {
        // Fallback thủ công khi cổng lỗi — khách không bị mắt đặt phòng
        setError(res.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không kết nối được cổng thanh toán.");
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bỏ tóm tắt đặt phòng và breakdown vì đã hiển thị ngoài giao diện chính */}

      {/* Chọn phương thức */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Chọn phương thức thanh toán</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {GUEST_METHODS.map((m) => (
            <button
              key={m.method}
              type="button"
              disabled={busy || reported}
              onClick={() => { setMethod(m.method); setError(null); }}
              className={
                "rounded-xl border p-3 text-left text-sm transition-colors " +
                (method === m.method ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted")
              }
            >
              <div className="flex items-center gap-2 font-medium">
                {m.method === "bank_transfer" ? <Building2 className="size-4" /> : <CreditCard className="size-4" />}
                {PAYMENT_METHOD_LABELS[m.method]}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-3 text-sm" role="status">
        <b>{DEMO_PAYMENTS ? "CHẾ ĐỘ MÔ PHỎNG — không thu tiền thật" : "Thanh toán trực tuyến chưa được kích hoạt"}</b>
        <p>{DEMO_PAYMENTS ? "Không chuyển tiền vào tài khoản mẫu. Các nút bên dưới chỉ kiểm thử luồng đặt cọc trên thiết bị này." : "Website chưa kết nối cổng thanh toán và tài khoản ngân hàng đã xác minh. Bạn có thể lưu yêu cầu đặt phòng, sau đó liên hệ lễ tân để được hướng dẫn."}</p>
        <p>Khoản cọc dự kiến ({percent}%): <b>{formatVND(deposit)}</b></p>
      </div>
      {reported && <p role="status">Báo chuyển khoản đang chờ đối chiếu; chưa xác nhận nhận cọc.</p>}

      {/* Đồng ý điều khoản */}
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => { setAgreed(e.target.checked); setError(null); }}
          className="mt-0.5"
        />
        <span>
          Tôi đã đọc và đồng ý{" "}
          {onOpenLegal ? (
            <button type="button" onClick={onOpenLegal} className="text-primary underline">
              điều khoản dịch vụ, chính sách hủy phòng và chính sách bảo mật
            </button>
          ) : (
            <b>điều khoản dịch vụ, chính sách hủy phòng và chính sách bảo mật</b>
          )}
          . Tiền cọc được hoàn theo mốc thời gian hủy ghi trong chính sách.
        </span>
      </label>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
          {method !== "bank_transfer" && (
            <div className="mt-1.5 text-xs">
              Bạn có thể thử lại, chọn <b>Chuyển khoản</b>, hoặc gọi hotline để lễ tân giữ phòng thủ công.
            </div>
          )}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Chỉ xác nhận nhận tiền sau khi đối soát. Bản hiện tại chưa có webhook thanh toán thật.
      </p>

      <Button className="w-full" onClick={() => void pay()} disabled={busy || !DEMO_PAYMENTS || reported}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {busy
          ? "Đang xác nhận..."
          : method === "stripe"
            ? "Mô phỏng thanh toán thẻ " + formatVND(deposit)
            : method === "bank_transfer" ? "Mô phỏng báo chuyển khoản" : "Mô phỏng thanh toán cọc"}
      </Button>
    </div>
  );
}

export function DepositDialog({ booking, onClose, onOpenLegal }: {
  booking: Booking;
  onClose: () => void;
  onOpenLegal?: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt cọc giữ phòng</DialogTitle>
          <DialogDescription>Mã đặt phòng {booking.code}</DialogDescription>
        </DialogHeader>
        <DepositPanel booking={booking} onOpenLegal={onOpenLegal} />
      </DialogContent>
    </Dialog>
  );
}
