import { useMemo, useState } from "react";
import { BedDouble, CalendarDays, Search, Users2, Wallet } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { BookingStatusBadge } from "../status";
import { DepositDialog } from "./DepositDialog";
import { DEPOSIT_PERCENT, useStore } from "../../lib/store";
import { formatDate, formatVND, nightsBetween } from "../../lib/format";

/** Trang "Đặt phòng của tôi" — khách xem trạng thái yêu cầu & cọc giữ phòng. */
export function MyBookings({ onBackHome }: { onBackHome?: () => void }) {
  const { currentUser, bookings, roomLabel } = useStore();
  const [payingId, setPayingId] = useState<string | null>(null);

  const mine = useMemo(
    () =>
      bookings
        .filter((b) => b.customerId === currentUser?.customerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bookings, currentUser],
  );
  // Luôn lấy booking mới nhất từ store để trạng thái cọc cập nhật realtime
  const paying = payingId ? bookings.find((b) => b.id === payingId) ?? null : null;

  if (mine.length === 0) {
    return (
      <div className="py-16 text-center">
        <BedDouble className="mx-auto size-12 text-muted-foreground/50" />
        <h2 className="mt-3 text-lg font-semibold">Bạn chưa có đặt phòng nào</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Khám phá các hạng phòng và gửi yêu cầu đặt ngay hôm nay.
        </p>
        {onBackHome && (
          <Button className="mt-4" onClick={onBackHome}>
            <Search className="size-4" /> Khám phá phòng
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Đặt phòng của tôi</h2>
        <p className="text-sm text-muted-foreground">Theo dõi trạng thái yêu cầu và đặt cọc giữ phòng.</p>
      </div>

      {mine.map((b) => {
        const nights = Math.max(nightsBetween(b.checkIn, b.checkOut), 1);
        const serviceTotal = b.services.reduce((s, x) => s + x.price * x.qty, 0);
        const total = b.roomPricePerNight * nights + serviceTotal;
        const percent = Math.round((b.depositPercent ?? DEPOSIT_PERCENT) * 100);
        const deposit = b.depositAmount ?? Math.round(total * DEPOSIT_PERCENT);
        const canPay = !b.depositPaid && (b.status === "pending" || b.status === "reserved");
        return (
          <Card key={b.id}>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{b.code}</span>
                  <BookingStatusBadge status={b.status} />
                  {b.depositPaid ? (
                    <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-100 text-emerald-700">
                      <Wallet className="size-3" /> Đã cọc {percent}%
                    </Badge>
                  ) : canPay ? (
                    <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-100 text-amber-700">
                      <Wallet className="size-3" /> Chưa cọc
                    </Badge>
                  ) : null}
                </div>
                <div className="font-medium">{roomLabel(b.roomId)}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {nights} đêm
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users2 className="size-3.5" /> {b.guests} khách
                  </span>
                </div>
                {b.note && <div className="text-xs text-muted-foreground">Ghi chú: {b.note}</div>}
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="sm:text-right">
                  <div className="font-semibold text-primary">{formatVND(total)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {b.depositPaid
                      ? `Đã cọc ${formatVND(b.depositAmount ?? deposit)}`
                      : `Cọc ${percent}%: ${formatVND(deposit)}`}
                  </div>
                </div>
                {canPay && (
                  <Button size="sm" onClick={() => setPayingId(b.id)}>
                    <Wallet className="size-4" /> Cọc ngay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {paying && <DepositDialog booking={paying} onClose={() => setPayingId(null)} />}
    </div>
  );
}
