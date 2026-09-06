import { useEffect, useRef, useState } from "react";
import { X, Send, Bot, ArrowRight, Loader2 } from "lucide-react";
import { HOTEL_NAME, useStore } from "../lib/store";
import { occupiedOn, revenueOn } from "../lib/analytics";
import { addDays, formatVND, toISODate } from "../lib/format";
import { askGemini, HotelContext } from "../lib/gemini";

interface Action { label: string; page: string }
interface Msg { id: string; role: "user" | "bot"; text: string; actions?: Action[] }

const SUGGESTIONS = [
  "Còn phòng trống không?",
  "Giá các loại phòng?",
  "Doanh thu hôm nay?",
  "Chính sách nhận & trả phòng?",
  "Khách sạn có dịch vụ gì?",
];

// Bỏ dấu tiếng Việt để so khớp từ khóa linh hoạt hơn.
function noAccent(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
}

let idc = 0;
const nid = () => `m${++idc}`;

export function Copilot({ onNavigate }: { onNavigate: (page: string) => void }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: nid(),
      role: "bot",
      text: "Xin chào 👋 Tôi là trợ lý AI chính thức của **Sao Mai Hotel** (được hỗ trợ bởi Google Gemini).\n\nTôi sẵn sàng giải đáp mọi thắc mắc về **phòng ốc, giá cả, dịch vụ, đặt phòng** hoặc hỗ trợ vận hành khách sạn.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking, open]);

  const getActionButtons = (q: string, replyText: string): Action[] => {
    const t = (noAccent(q) + " " + noAccent(replyText)).toLowerCase();
    const actions: Action[] = [];
    if (t.includes("phong") || t.includes("trong") || t.includes("dat phong")) {
      actions.push({ label: "Tra phòng trống", page: "availability" }, { label: "Đặt phòng", page: "bookings" });
    }
    if (t.includes("doanh thu") || t.includes("thong ke") || t.includes("cong suat")) {
      actions.push({ label: "Xem thống kê", page: "stats" });
    }
    if (t.includes("cong no") || t.includes("hoa don") || t.includes("thanh toan")) {
      actions.push({ label: "Mở hóa đơn", page: "invoices" });
    }
    if (t.includes("dich vu") || t.includes("an sang") || t.includes("dua don")) {
      actions.push({ label: "Dịch vụ", page: "services" });
    }
    if (t.includes("khach hang") || t.includes("hoi vien")) {
      actions.push({ label: "Khách hàng", page: "customers" });
    }
    return actions.slice(0, 2);
  };

  const offlineAnswer = (q: string): Msg => {
    const t = noAccent(q);
    const today = toISODate(new Date());
    const has = (...k: string[]) => k.some((x) => t.includes(x));

    // Giá & các loại phòng
    if (has("gia", "loai phong", "hang phong", "bao gia", "nhung phong", "co phong nao")) {
      const list = store.roomTypes
        .map((t) => `• **${t.name}**: ${formatVND(t.basePrice)}/đêm (sức chứa ${t.capacity} khách, ${t.size ? t.size + "m²" : "chưa có diện tích"})`)
        .join("\n");
      return {
        id: nid(),
        role: "bot",
        text: `✨ **Bảng giá và các hạng phòng tại khách sạn:**\n\n${list}`,
        actions: [{ label: "Tra phòng trống", page: "availability" }, { label: "Đặt phòng", page: "bookings" }],
      };
    }

    // Phòng trống
    if (has("phong trong", "con phong", "phong nao", "trong khong", "availab")) {
      const avail = store.getAvailableRooms(today, addDays(today, 1));
      const sample = avail.slice(0, 4).map((r) => `Phòng ${r.number}`).join(", ");
      return {
        id: nid(), role: "bot",
        text: avail.length
          ? `Hiện có **${avail.length}/${store.rooms.length}** phòng trống cho đêm nay${sample ? `: ${sample}${avail.length > 4 ? "…" : ""}` : ""}.`
          : "Rất tiếc, hiện không còn phòng trống cho đêm nay.",
        actions: [{ label: "Tra phòng trống", page: "availability" }, { label: "Đặt phòng", page: "bookings" }],
      };
    }

    // Doanh thu
    if (has("doanh thu", "thu nhap", "tien", "revenue")) {
      const rvToday = revenueOn(store.bookings, today);
      let week = 0;
      for (let i = 0; i < 7; i++) week += revenueOn(store.bookings, addDays(today, -i));
      return {
        id: nid(), role: "bot",
        text: `Doanh thu hôm nay: **${formatVND(rvToday)}**.\n7 ngày gần nhất: **${formatVND(week)}**.`,
        actions: [{ label: "Xem thống kê", page: "stats" }],
      };
    }

    // Công suất
    if (has("cong suat", "occupancy", "lap day", "ty le phong")) {
      const occ = occupiedOn(store.bookings, today);
      const rate = Math.round((occ / Math.max(store.rooms.length, 1)) * 100);
      return {
        id: nid(), role: "bot",
        text: `Công suất hôm nay: **${rate}%** (${occ}/${store.rooms.length} phòng đang có khách).`,
        actions: [{ label: "Bảng thống kê", page: "stats" }],
      };
    }

    // Công nợ / hóa đơn chưa thanh toán
    if (has("cong no", "chua thanh toan", "chua thu", "no tien", "unpaid", "hoa don")) {
      const open = store.invoices.filter((i) => i.status !== "paid");
      const owed = open.reduce((s, i) => s + (i.total - i.paid), 0);
      return {
        id: nid(), role: "bot",
        text: open.length
          ? `Có **${open.length}** hóa đơn chưa tất toán, tổng còn nợ **${formatVND(owed)}**.`
          : "Tuyệt vời — không có công nợ nào đang treo. 🎉",
        actions: [{ label: "Mở hóa đơn", page: "invoices" }],
      };
    }

    // Nhận phòng hôm nay
    if (has("nhan phong", "check in", "check-in", "khach den", "arrival")) {
      const arr = store.bookings.filter((b) => b.checkIn === today && b.status !== "cancelled");
      const names = arr.map((b) => store.customer(b.customerId)?.name).filter(Boolean).join(", ");
      return {
        id: nid(), role: "bot",
        text: arr.length ? `Hôm nay có **${arr.length}** lượt nhận phòng: ${names}.` : "Hôm nay không có khách nhận phòng.",
        actions: [{ label: "Tới đặt phòng", page: "bookings" }],
      };
    }

    // Trả phòng hôm nay
    if (has("tra phong", "check out", "check-out", "departure", "roi di")) {
      const dep = store.bookings.filter((b) => b.checkOut === today && b.status !== "cancelled");
      const names = dep.map((b) => store.customer(b.customerId)?.name).filter(Boolean).join(", ");
      return {
        id: nid(), role: "bot",
        text: dep.length ? `Hôm nay có **${dep.length}** lượt trả phòng: ${names}.` : "Hôm nay không có khách trả phòng.",
        actions: [{ label: "Tới đặt phòng", page: "bookings" }],
      };
    }

    return {
      id: nid(), role: "bot",
      text: `Dạ tôi sẵn sàng hỗ trợ bạn về câu hỏi: **"${q}"**.\n\nBạn có thể hỏi thêm về tình hình phòng ốc, công suất, doanh thu, khách hàng hoặc trò chuyện tự do! ✨`,
      actions: [{ label: "Tra phòng trống", page: "availability" }, { label: "Xem thống kê", page: "stats" }],
    };
  };

  const send = async (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q || thinking) return;

    const userMsg: Msg = { id: nid(), role: "user", text: q };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setThinking(true);

    try {
      const today = toISODate(new Date());
      const avail = store.getAvailableRooms(today, addDays(today, 1));
      const occ = occupiedOn(store.bookings, today);
      const rate = Math.round((occ / Math.max(store.rooms.length, 1)) * 100);
      const rvToday = revenueOn(store.bookings, today);

      const hotelContext: HotelContext = {
        hotelName: HOTEL_NAME,
        totalRooms: store.rooms.length,
        availableRoomsCount: avail.length,
        roomTypesSummary: store.roomTypes.map((t) => `${t.name}: ${formatVND(t.basePrice)}/đêm (sức chứa ${t.capacity} khách)`).join("; "),
        servicesSummary: store.services.map((s) => `${s.name}: ${formatVND(s.price)}`).join("; "),
        todayStats: `Hôm nay có ${avail.length}/${store.rooms.length} phòng trống. Công suất ~${rate}%. Doanh thu ngày: ${formatVND(rvToday)}.`,
      };

      const history = newMsgs.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

      const replyText = await askGemini(q, history, hotelContext);
      const actions = getActionButtons(q, replyText);

      setMsgs((m) => [...m, { id: nid(), role: "bot", text: replyText, actions }]);
    } catch {
      // Fallback tự động sang bộ trả lời offline
      const reply = offlineAnswer(q);
      setMsgs((m) => [...m, reply]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Nút nổi */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 grid place-items-center size-14 rounded-full text-white shadow-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Trợ lý AI"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
        {!open && <span className="absolute inset-0 rounded-full ring-4 ring-amber-400/40 animate-ping" />}
      </button>

      {/* Bảng chat */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white">
            <div className="grid place-items-center size-8 rounded-lg bg-white/20"><Bot className="size-4" /></div>
            <div className="leading-tight">
              <div className="font-medium text-sm font-semibold">Trợ lý AI</div>
              <div className="text-[11px] opacity-90">Hỏi nhanh về vận hành khách sạn</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                }`}>
                  <RichText text={m.text} />
                  {m.actions && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => { onNavigate(a.page); setOpen(false); }}
                          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent transition-colors"
                        >
                          {a.label} <ArrowRight className="size-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Đang phân tích…
                </div>
              </div>
            )}
          </div>

          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={thinking}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi…"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <button type="submit" disabled={!input.trim() || thinking}
              className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Hiển thị **đậm** đơn giản và xuống dòng.
function RichText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-wrap">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>,
      )}
    </span>
  );
}
