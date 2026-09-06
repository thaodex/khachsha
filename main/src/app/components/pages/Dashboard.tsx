/* ===========================================================================
 * TỔNG QUAN (DASHBOARD)
 *
 * Bố cục học theo các PMS/BI khách sạn tốt nhất hiện nay (Cloudbeds Insights,
 * Mews, Stayntouch, Apaleo) + nguyên tắc dashboard của Domo/BoldBI:
 * một màn hình phải trả lời đúng 3 câu hỏi, theo thứ tự ưu tiên:
 *   1. Có gì bất thường phải xử lý ngay?  → dải cảnh báo đầu trang
 *   2. Khách sạn đang chạy tốt không?      → 6 KPI (có ADR & RevPAR) + biểu đồ
 *   3. Việc hôm nay xong chưa?              → nhận/trả phòng, dọn phòng 1 chạm
 * =========================================================================*/
import { useId, useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BedDouble, Bell, CalendarCheck,
  CheckCircle2, ClipboardList, Clock, DollarSign, Download, Loader2, LogIn, LogOut,
  Minus, Percent, Search, Shirt, Sparkles, TrendingUp, TriangleAlert, Users, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { ComboChartSVG, DonutSVG } from "../MiniCharts";
import { Button } from "../ui/button";
import { useStore } from "../../lib/store";
import { buildSeries, occupiedOn, revenueOn } from "../../lib/analytics";
import { adrOn, buildForecast, comparePeriods, revparOn, seriesToCsv, sourceMix } from "../../lib/kpi";
import { addDays, formatVND, toISODate } from "../../lib/format";
import { BOOKING_SOURCE_META, ROOM_STATUS_META } from "../status";
import { activeProvider } from "../../lib/ai";
import { canAccess, type PageKey } from "../Layout";
import type { Booking, Room } from "../../lib/types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const PERIODS = [7, 14, 30] as const;
type Period = (typeof PERIODS)[number];

const STATUS_COLOR: Record<string, string> = {
  available: "#059669",
  occupied: "#0284c7",
  cleaning: "#d97706",
  maintenance: "#e11d48",
};

/** Rút gọn tiền cho trục biểu đồ: 2.400.000 → "2,4tr" */
function compactVND(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace(".", ",")}tr`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(v);
}

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100, h = 26;
  const id = "sl" + useId().replace(/:/g, "");
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 4) - 2] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-16 h-7 shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
        strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}

function Delta({ value, suffix, goodUp = true }: { value: number; suffix?: string; goodUp?: boolean }) {
  const flat = value === 0;
  const up = value > 0;
  const good = flat ? false : up === goodUp;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] ${
      flat ? "bg-muted text-muted-foreground" : good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
    }`}>
      <Icon className="size-3" />{flat ? "—" : `${up ? "+" : ""}${value}${suffix ?? ""}`}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, hint, accent, spark, delta, deltaSuffix, deltaGoodUp = true, meter, onClick }: {
  icon: typeof BedDouble;
  label: string;
  value: string;
  hint?: string;
  accent: string;
  spark?: number[];
  delta?: number;
  deltaSuffix?: string;
  deltaGoodUp?: boolean;
  meter?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl border bg-white p-4 text-left transition-shadow ${onClick ? "hover:shadow-md" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid place-items-center size-9 rounded-xl" style={{ backgroundColor: `${accent}1a`, color: accent }}>
          <Icon className="size-4" />
        </span>
        {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} goodUp={deltaGoodUp} />}
      </div>
      <div className="mt-3 text-xs text-muted-foreground truncate">{label}</div>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold leading-none tracking-tight">{value}</span>
        {spark && <Sparkline data={spark} color={accent} />}
      </div>
      {meter !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, meter))}%`, backgroundColor: accent }} />
        </div>
      )}
      {hint && <div className="mt-2 text-[11px] text-muted-foreground truncate">{hint}</div>}
    </button>
  );
}

function Panel({ title, icon: Icon, action, children, className }: {
  title: string;
  icon: typeof BedDouble;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-white ${className ?? ""}`}>
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 md:px-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />{title}
        </h3>
        {action}
      </header>
      <div className="px-4 pb-4 md:px-5 md:pb-5">{children}</div>
    </section>
  );
}

function StayRow({ b, kind, onAction }: { b: Booking; kind: "in" | "out"; onAction: (b: Booking) => void }) {
  const { customer, roomLabel } = useStore();
  const c = customer(b.customerId);
  const done = kind === "in" ? b.status === "checked_in" : b.status === "checked_out";
  const hasDeposit = (b.depositAmount ?? 0) > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{c?.name ?? "Khách lẻ"}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{b.code}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>Phòng {roomLabel(b.roomId)}</span>
          <span>·</span>
          <span>{b.guests} khách</span>
          {kind === "in" && hasDeposit && (
            <span className={`rounded-full px-1.5 py-0.5 ${b.depositPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {b.depositPaid ? "Đã cọc" : "Chưa cọc"}
            </span>
          )}
        </div>
      </div>
      {done ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
          <CheckCircle2 className="size-3" /> Xong
        </span>
      ) : (
        <Button size="sm" variant={kind === "in" ? "default" : "outline"} onClick={() => onAction(b)}>
          {kind === "in" ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
          {kind === "in" ? "Nhận" : "Trả"}
        </Button>
      )}
    </div>
  );
}

interface AlertItem {
  id: string;
  tone: "danger" | "warn" | "info";
  icon: typeof BedDouble;
  title: string;
  detail: string;
  page?: PageKey;
}

const TONE: Record<AlertItem["tone"], string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function Dashboard({ onNavigate }: { onNavigate?: (page: PageKey) => void }) {
  const {
    rooms, bookings, invoices, currentUser, roomType,
    updateBookingStatus, ensureInvoice, saveRoom,
  } = useStore();

  const today = toISODate(new Date());
  const [days, setDays] = useState<Period>(14);

  const go = (p: PageKey) => onNavigate?.(p);
  const allow = (p: PageKey) => !!onNavigate && !!currentUser && canAccess(p, currentUser.role);

  /* -------------------------------------------------------------- DỮ LIỆU */
  const series = useMemo(() => buildSeries(bookings, rooms, days), [bookings, rooms, days]);
  const forecast = useMemo(() => buildForecast(bookings, rooms, 7, today), [bookings, rooms, today]);
  const mix = useMemo(() => sourceMix(bookings, 30, today), [bookings, today]);
  const compare = useMemo(() => comparePeriods(bookings, rooms, days, today), [bookings, rooms, days, today]);

  const occToday = occupiedOn(bookings, today);
  const occRate = Math.round((occToday / Math.max(rooms.length, 1)) * 100);
  const revToday = revenueOn(bookings, today);
  const adr = adrOn(bookings, today);
  const revpar = revparOn(bookings, rooms, today);
  const available = rooms.filter((r) => r.status === "available").length;
  const stayingNow = bookings.filter((b) => b.status === "checked_in").length;

  const yesterday = addDays(today, -1);
  const prevOcc = Math.round((occupiedOn(bookings, yesterday) / Math.max(rooms.length, 1)) * 100);
  const prevRev = revenueOn(bookings, yesterday);
  const prevAdr = adrOn(bookings, yesterday);
  const revDeltaPct = prevRev > 0 ? Math.round(((revToday - prevRev) / prevRev) * 100) : 0;
  const adrDeltaPct = prevAdr > 0 ? Math.round(((adr - prevAdr) / prevAdr) * 100) : 0;

  const occSpark = series.map((s) => s.occupancy);
  const revSpark = series.map((s) => s.revenue);

  const arrivals = bookings.filter((b) => b.checkIn === today && (b.status === "reserved" || b.status === "checked_in"));
  const departures = bookings.filter((b) => b.checkOut === today && (b.status === "checked_in" || b.status === "checked_out"));
  const pending = bookings.filter((b) => b.status === "pending");
  const overdue = bookings.filter((b) => b.status === "checked_in" && b.checkOut < today);
  const depositDue = arrivals.filter((b) => (b.depositAmount ?? 0) > 0 && !b.depositPaid);
  const cleaning = rooms.filter((r) => r.status === "cleaning");
  const maintenance = rooms.filter((r) => r.status === "maintenance");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0);

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date());

  /* ------------------------------------------------------------ CẢNH BÁO */
  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = [];
    if (overdue.length > 0) list.push({
      id: "overdue", tone: "danger", icon: Clock,
      title: `${overdue.length} phòng quá hạn trả`,
      detail: "Khách đã qua ngày trả phòng nhưng chưa check-out.", page: "bookings",
    });
    if (pending.length > 0) list.push({
      id: "pending", tone: "warn", icon: Bell,
      title: `${pending.length} yêu cầu chờ duyệt`,
      detail: "Duyệt sớm để giữ phòng cho khách.", page: "requests",
    });
    if (depositDue.length > 0) list.push({
      id: "deposit", tone: "warn", icon: Wallet,
      title: `${depositDue.length} khách đến hôm nay chưa cọc`,
      detail: "Nhắc khách thanh toán trước khi nhận phòng.", page: "bookings",
    });
    if (unpaidTotal > 0) list.push({
      id: "unpaid", tone: "info", icon: DollarSign,
      title: `Còn ${formatVND(unpaidTotal)} chưa thu`,
      detail: `${unpaidInvoices.length} hóa đơn chưa thanh toán đủ.`, page: "invoices",
    });
    if (maintenance.length > 0) list.push({
      id: "maintenance", tone: "danger", icon: TriangleAlert,
      title: `${maintenance.length} phòng đang bảo trì`,
      detail: `Phòng ${maintenance.map((r) => r.number).join(", ")} không bán được.`, page: "rooms",
    });
    if (cleaning.length > 0) list.push({
      id: "cleaning", tone: "info", icon: Shirt,
      title: `${cleaning.length} phòng chờ dọn`,
      detail: "Dọn xong bấm “Sẵn sàng” ở thẻ Dọn phòng để mở bán lại.",
    });
    const low = forecast.slice(1).find((f) => f.occupancy < 40);
    if (low) list.push({
      id: "low", tone: "info", icon: TrendingUp,
      title: `Ngày ${low.label} mới đạt ${low.occupancy}%`,
      detail: "Cân nhắc mở khuyến mãi hoặc giảm giá linh hoạt.", page: "revenue",
    });
    return list;
  }, [overdue.length, pending.length, depositDue.length, unpaidTotal, unpaidInvoices.length, maintenance, cleaning.length, forecast]);

  /* ------------------------------------------------------------ HÀNH ĐỘNG */
  const doCheckIn = (b: Booking) => {
    if (b.checkIn > today) return toast.error("Chưa tới ngày nhận phòng.");
    const res = updateBookingStatus(b.id, "checked_in");
    if (!res.ok) return toast.error(res.message);
    toast.success(`${b.code}: đã nhận phòng.`);
  };

  const doCheckOut = (b: Booking) => {
    const res = updateBookingStatus(b.id, "checked_out");
    if (!res.ok) return toast.error(res.message);
    ensureInvoice(b.id);
    toast.success(`${b.code}: đã trả phòng, hóa đơn đã được tạo.`);
  };

  const markReady = (r: Room) => {
    saveRoom({ ...r, status: "available" });
    toast.success(`Phòng ${r.number} đã sẵn sàng đón khách.`);
  };

  const exportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Báo Cáo Doanh Thu", {
        views: [{ showGridLines: false }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });

      // ---- 1. Header / Nhận diện thương hiệu ----
      sheet.mergeCells('A1:D1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = "SAO MAI HOTEL - BÁO CÁO DOANH THU";
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const startDate = series[0]?.date || '';
      const endDate = series[series.length - 1]?.date || '';
      const exportTime = new Date().toLocaleString('vi-VN');

      sheet.mergeCells('A2:D2');
      const subTitleCell = sheet.getCell('A2');
      subTitleCell.value = `Từ ngày ${startDate} đến ngày ${endDate}  |  Xuất lúc ${exportTime}`;
      subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
      subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // ---- 2. Khối Tổng quan (KPI cards) ----
      sheet.getCell('A4').value = "TỔNG DOANH THU";
      sheet.getCell('B4').value = "CÔNG SUẤT TB";
      sheet.getCell('C4').value = "TỔNG PHÒNG BÁN";
      sheet.getCell('D4').value = "NGÀY CAO ĐIỂM (DT)";
      
      ['A4', 'B4', 'C4', 'D4'].forEach(c => {
        const cell = sheet.getCell(c);
        cell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      const startRow = 8;
      const endRow = startRow + series.length - 1;
      
      sheet.getCell('A5').value = { formula: `SUM(D${startRow}:D${endRow})`, date1904: false };
      sheet.getCell('A5').numFmt = '#,##0" ₫"';
      
      sheet.getCell('B5').value = { formula: `AVERAGE(B${startRow}:B${endRow})`, date1904: false };
      sheet.getCell('B5').numFmt = '0.0%';
      
      sheet.getCell('C5').value = { formula: `SUM(C${startRow}:C${endRow})`, date1904: false };
      sheet.getCell('C5').numFmt = '#,##0';
      
      sheet.getCell('D5').value = { formula: `MAX(D${startRow}:D${endRow})`, date1904: false };
      sheet.getCell('D5').numFmt = '#,##0" ₫"';

      ['A5', 'B5', 'C5', 'D5'].forEach(c => {
        const cell = sheet.getCell(c);
        cell.font = { size: 12, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });

      // ---- 3. Bảng Chi Tiết (Data Table) ----
      sheet.getRow(7).values = ["Ngày", "Công suất (%)", "Số phòng bán", "Doanh thu (VNĐ)"];
      sheet.getRow(7).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} };
      });

      sheet.getColumn(1).width = 18;
      sheet.getColumn(2).width = 18;
      sheet.getColumn(3).width = 18;
      sheet.getColumn(4).width = 25;

      let maxRev = 0;
      series.forEach(p => { if(p.revenue > maxRev) maxRev = p.revenue; });

      series.forEach((p, index) => {
        const r = sheet.addRow([
          p.date,
          p.occupancy / 100,
          p.occupied,
          p.revenue,
        ]);
        
        if (index % 2 === 1) {
          r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } });
        }
        
        r.getCell(2).numFmt = "0.0%";
        r.getCell(3).numFmt = "#,##0";
        r.getCell(4).numFmt = '#,##0" ₫"';
        r.getCell(3).alignment = { horizontal: 'center' };
        
        if (p.revenue === maxRev && maxRev > 0) {
          r.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          r.getCell(4).font = { bold: true, color: { argb: 'FF166534' } };
        }
        if (p.occupancy === 0) {
          r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          r.getCell(2).font = { color: { argb: 'FF991B1B' } };
        }
        
        r.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
      });

      // ---- 4. Dòng Tổng Kết ----
      const totalRowIdx = endRow + 1;
      sheet.getCell(`A${totalRowIdx}`).value = "TỔNG / TRUNG BÌNH";
      sheet.getCell(`B${totalRowIdx}`).value = { formula: `AVERAGE(B${startRow}:B${endRow})`, date1904: false };
      sheet.getCell(`C${totalRowIdx}`).value = { formula: `SUM(C${startRow}:C${endRow})`, date1904: false };
      sheet.getCell(`D${totalRowIdx}`).value = { formula: `SUM(D${startRow}:D${endRow})`, date1904: false };

      const totalRow = sheet.getRow(totalRowIdx);
      totalRow.getCell(2).numFmt = "0.0%";
      totalRow.getCell(3).numFmt = "#,##0";
      totalRow.getCell(3).alignment = { horizontal: 'center' };
      totalRow.getCell(4).numFmt = '#,##0" ₫"';

      totalRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FF0F172A' } };
        if(!c.fill || c.fill.type !== 'pattern') {
           c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        }
        c.border = { top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} };
      });

      sheet.getCell(`A${totalRowIdx + 2}`).value = "Báo cáo được tạo tự động bởi AI Engine — Sao Mai Hotel Management Suite";
      sheet.getCell(`A${totalRowIdx + 2}`).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      sheet.mergeCells(`A${totalRowIdx + 2}:D${totalRowIdx + 2}`);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `bao-cao-doanh-thu-${days}-ngay.xlsx`);
      toast.success(`Đã xuất báo cáo ${days} ngày ra file Excel thành công.`);
    } catch (e) {
      toast.error("Xuất Excel thất bại.");
      console.error(e);
    }
  };

  /* ---------------------------------------------------------- NHẬN XÉT AI */
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const runInsight = async () => {
    setLoading(true);
    setInsight("");
    try {
      const yOcc = occupiedOn(bookings, yesterday);
      const trend = occToday > yOcc ? "up" : occToday < yOcc ? "down" : "flat";
      const timeout = new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000));
      const res = await Promise.race([
        activeProvider.occupancyInsight({
          occupancyRate: occToday / Math.max(rooms.length, 1),
          revenueToday: revToday,
          availableRooms: available,
          totalRooms: rooms.length,
          trend,
        }),
        timeout,
      ]);
      setInsight(res as string);
    } catch {
      setInsight("Không thể tạo nhận xét AI lúc này (hết thời gian chờ). Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const donut = [
    { label: ROOM_STATUS_META.occupied.label, value: rooms.filter((r) => r.status === "occupied").length, color: STATUS_COLOR.occupied },
    { label: ROOM_STATUS_META.available.label, value: available, color: STATUS_COLOR.available },
    { label: ROOM_STATUS_META.cleaning.label, value: cleaning.length, color: STATUS_COLOR.cleaning },
    { label: ROOM_STATUS_META.maintenance.label, value: maintenance.length, color: STATUS_COLOR.maintenance },
  ];

  return (
    <div className="space-y-5">
      {/* 1 — THANH ĐIỀU KHIỂN ------------------------------------------------ */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 md:px-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{greeting()}, {currentUser?.name ?? "bạn"}</div>
          <div className="mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {todayLabel} · {stayingNow} khách đang lưu trú · {arrivals.length} lượt nhận phòng
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  days === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p} ngày
              </button>
            ))}
          </div>

          {allow("availability") && (
            <Button size="sm" variant="outline" onClick={() => go("availability")}>
              <Search className="size-4" /> <span className="hidden sm:inline">Tra phòng trống</span>
            </Button>
          )}
          {allow("bookings") && (
            <Button size="sm" variant="outline" onClick={() => go("bookings")}>
              <ClipboardList className="size-4" /> <span className="hidden sm:inline">Đặt phòng</span>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <Download className="size-4" /> <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
          {allow("requests") && (
            <Button size="sm" onClick={() => go("requests")}>
              <Bell className="size-4" /> Duyệt yêu cầu
              {pending.length > 0 && (
                <span className="ml-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-medium text-black">
                  {pending.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </section>

      {/* 2 — CẢNH BÁO CẦN XỬ LÝ ------------------------------------------------ */}
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0" /> Mọi việc đang trong tầm kiểm soát — không có cảnh báo nào.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => {
            const Icon = a.icon;
            const clickable = !!a.page && allow(a.page);
            return (
              <button
                key={a.id}
                type="button"
                disabled={!clickable}
                onClick={() => a.page && go(a.page)}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-shadow ${TONE[a.tone]} ${
                  clickable ? "hover:shadow-md" : "cursor-default"
                }`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.title}</span>
                  <span className="block text-xs opacity-80">{a.detail}</span>
                </span>
                {clickable && <ArrowRight className="size-4 shrink-0 opacity-60" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 3 — 6 CHỈ SỐ CỐT LÕI ------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard icon={Percent} label="Công suất hôm nay" value={`${occRate}%`} accent="#4f46e5"
          spark={occSpark} delta={occRate - prevOcc} deltaSuffix="%" meter={occRate}
          hint={`${occToday}/${rooms.length} phòng có khách`} onClick={allow("calendar") ? () => go("calendar") : undefined} />
        <KpiCard icon={Wallet} label="ADR — giá bán bình quân" value={formatVND(adr)} accent="#0284c7"
          delta={adrDeltaPct} deltaSuffix="%" hint="Doanh thu phòng / số phòng bán" />
        <KpiCard icon={TrendingUp} label="RevPAR" value={formatVND(revpar)} accent="#7c3aed"
          hint="Doanh thu phòng / tổng phòng hiện có" />
        <KpiCard icon={DollarSign} label="Doanh thu hôm nay" value={formatVND(revToday)} accent="#d97706"
          spark={revSpark} delta={revDeltaPct} deltaSuffix="%"
          onClick={allow("invoices") ? () => go("invoices") : undefined} />
        <KpiCard icon={Users} label="Khách đang lưu trú" value={String(stayingNow)} accent="#059669"
          hint={`${arrivals.length} nhận · ${departures.length} trả hôm nay`}
          onClick={allow("bookings") ? () => go("bookings") : undefined} />
        <KpiCard icon={BedDouble} label="Phòng sẵn sàng bán" value={`${available}/${rooms.length}`} accent="#0f766e"
          meter={(available / Math.max(rooms.length, 1)) * 100}
          hint={`${cleaning.length} chờ dọn · ${maintenance.length} bảo trì`}
          onClick={allow("availability") ? () => go("availability") : undefined} />
      </div>

      {/* 4 — BIỂU ĐỒ CHÍNH ---------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          icon={Activity}
          title={`Công suất & doanh thu ${days} ngày`}
          action={
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "#4f46e5" }} /> Công suất</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "#d97706" }} /> Doanh thu</span>
            </div>
          }
        >
          <div className="h-72">
            <ComboChartSVG data={series} formatRevenue={formatVND} compactRevenue={compactVND} />
          </div>
          <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Tổng doanh thu kỳ này</span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {formatVND(compare.revenue)} <Delta value={compare.revenueDeltaPct} suffix="%" />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Công suất bình quân</span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {compare.occupancyAvg}% <Delta value={compare.occupancyDelta} suffix="%" />
              </span>
            </div>
          </div>
        </Panel>

        <Panel icon={BedDouble} title="Cơ cấu trạng thái phòng">
          <div className="mx-auto h-44 w-44">
            <DonutSVG segments={donut} centerValue={`${occRate}%`} centerLabel="đang có khách" />
          </div>
          <div className="mt-4 space-y-2">
            {donut.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-muted-foreground">{s.label}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 5 — VIỆC HÔM NAY ----------------------------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel icon={LogIn} title={`Nhận phòng hôm nay (${arrivals.length})`}>
          <div className="space-y-2">
            {arrivals.length === 0 && <p className="text-sm text-muted-foreground">Không có khách nhận phòng.</p>}
            {arrivals.map((b) => <StayRow key={b.id} b={b} kind="in" onAction={doCheckIn} />)}
          </div>
        </Panel>

        <Panel icon={LogOut} title={`Trả phòng hôm nay (${departures.length})`}>
          <div className="space-y-2">
            {departures.length === 0 && <p className="text-sm text-muted-foreground">Không có khách trả phòng.</p>}
            {departures.map((b) => <StayRow key={b.id} b={b} kind="out" onAction={doCheckOut} />)}
          </div>
        </Panel>

        <Panel icon={Shirt} title={`Dọn phòng (${cleaning.length + maintenance.length})`}>
          <div className="space-y-2">
            {cleaning.length + maintenance.length === 0 && (
              <p className="text-sm text-muted-foreground">Toàn bộ phòng đã sẵn sàng.</p>
            )}
            {[...cleaning, ...maintenance].map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                <span className={`size-2.5 shrink-0 rounded-full ${ROOM_STATUS_META[r.status].dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Phòng {r.number}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {ROOM_STATUS_META[r.status].label} · {roomType(r.typeId)?.name ?? "—"}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => markReady(r)}>Sẵn sàng</Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 6 — DỰ BÁO & KÊNH ĐẶT ------------------------------------------------ */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" icon={CalendarCheck} title="Dự báo 7 ngày tới (đặt phòng đã có)">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {forecast.map((f) => (
              <div key={f.date} className={`rounded-xl border p-2 text-center ${f.date === today ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="text-[11px] font-medium">{f.weekday}</div>
                <div className="text-[11px] text-muted-foreground">{f.label}</div>
                <div className="mx-auto mt-2 flex h-16 w-5 items-end overflow-hidden rounded-full bg-muted">
                  <div
                    className="w-full rounded-full transition-all"
                    style={{
                      height: `${Math.max(4, f.occupancy)}%`,
                      backgroundColor: f.occupancy >= 85 ? "#e11d48" : f.occupancy >= 50 ? "#4f46e5" : "#94a3b8",
                    }}
                  />
                </div>
                <div className="mt-1.5 text-sm font-semibold">{f.occupancy}%</div>
                <div className="text-[11px] text-emerald-600">+{f.arrivals} đến</div>
                <div className="text-[11px] text-rose-500">-{f.departures} đi</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Cột đỏ = sắp kín phòng (≥ 85%), nên nâng giá. Cột xám = còn nhiều phòng (&lt; 50%), nên đẩy khuyến mãi.
          </p>
        </Panel>

        <Panel icon={Users} title="Kênh đặt phòng 30 ngày">
          {mix.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đặt phòng nào trong 30 ngày.</p>
          ) : (
            <div className="space-y-3">
              {mix.map((s) => {
                const meta = BOOKING_SOURCE_META[s.source];
                const Icon = meta.icon;
                return (
                  <div key={s.source}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{meta.label}</span>
                      <span className="text-muted-foreground">{s.count} · {s.share}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.share}%` }} />
                    </div>
                  </div>
                );
              })}
              {allow("channels") && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => go("channels")}>
                  Đối soát kênh & hoa hồng <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </Panel>
      </div>

      {/* 7 — NHẬN XÉT AI ------------------------------------------------------ */}
      <Panel
        icon={Sparkles}
        title="Nhận xét AI"
        action={
          <Button size="sm" variant="outline" onClick={runInsight} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Phân tích"}
          </Button>
        }
      >
        {loading && <p className="text-sm text-muted-foreground">Đang phân tích công suất…</p>}
        {!loading && !insight && (
          <p className="text-sm text-muted-foreground">
            Bấm “Phân tích” để AI đọc số liệu hôm nay và gợi ý hành động (nâng giá, mở khuyến mãi, đẩy kênh nào).
          </p>
        )}
        {!loading && insight && <p className="whitespace-pre-wrap text-sm">{insight}</p>}
      </Panel>

      {/* 8 — SƠ ĐỒ PHÒNG ------------------------------------------------------ */}
      <Panel
        icon={BedDouble}
        title="Sơ đồ phòng"
        action={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {(Object.keys(ROOM_STATUS_META) as Array<keyof typeof ROOM_STATUS_META>).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${ROOM_STATUS_META[k].dot}`} /> {ROOM_STATUS_META[k].label}
              </span>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {rooms.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">P.{r.number}</div>
                <div className="truncate text-[11px] text-muted-foreground">{roomType(r.typeId)?.name ?? "—"}</div>
              </div>
              <span className={`size-2.5 shrink-0 rounded-full ${ROOM_STATUS_META[r.status].dot}`} title={ROOM_STATUS_META[r.status].label} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
