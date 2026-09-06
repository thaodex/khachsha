import { useEffect, useRef, useState, useMemo } from "react";
import {
  ArrowRight,
  Bot,
  Loader2,
  Send,
  X,
  RotateCcw,
  Sparkles,
  BedDouble,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { HOTEL_NAME, useStore } from "../../lib/store";
import { RoomType } from "../../lib/types";
import { addDays, formatVND, nightsBetween, toISODate } from "../../lib/format";
import { BookingFlow } from "./BookingFlow";
import { askGemini, HotelContext } from "../../lib/gemini";

/** Đề xuất phòng kèm theo một tin nhắn của bot. */
interface Offer {
  typeId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  perNight: number;
  total: number;
  nights: number;
}

interface Msg {
  id: string;
  role: "user" | "bot";
  text: string;
  offers?: Offer[];
  time?: string;
}

const SUGGESTIONS = [
  "Đặt phòng cuối tuần",
  "Báo giá các hạng phòng",
  "Lịch trình du lịch 3N2Đ",
  "Điểm ăn uống gần đây",
  "Viết bài thơ tặng kỳ nghỉ",
];

let seq = 0;
const nid = () => `c${++seq}`;
const getTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/** Bỏ dấu tiếng Việt để so khớp tự nhiên hơn. */
function noAccent(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0111/gi, "d").toLowerCase();
}

/**
 * Chỉ hiện thẻ đề xuất phòng khi câu hỏi THỰC SỰ liên quan tới đặt phòng /
 * giá / tình trạng phòng trống — tránh việc bot gắn thẻ phòng vào mọi câu
 * trả lời (VD: hỏi giờ ăn sáng thì không cần thẻ phòng đi kèm).
 */
function isRoomIntent(t: string): boolean {
  return /\b(phong|dat phong|book|booking|gia phong|hang phong|loai phong|phong trong|con phong|trong khong|available|nhan phong|check ?in|dem|nights?)\b/.test(
    t,
  );
}

/** Đọc số khách từ câu nói: "2 người", "gia đình 4 khách". */
function parseGuests(t: string): number | null {
  const m = t.match(/(\d+)\s*(nguoi|khach|khách|guest|pax)/);
  if (m) return Math.min(Math.max(Number(m[1]), 1), 10);
  if (/\b(mot minh|solo|di mot nguoi)\b/.test(t)) return 1;
  if (/\b(cap doi|honeymoon|vo chong)\b/.test(t)) return 2;
  return null;
}

/** Đọc số đêm: "3 đêm", "2 ngày 1 đêm". */
function parseNights(t: string): number | null {
  const m = t.match(/(\d+)\s*(dem|night)/);
  return m ? Math.min(Math.max(Number(m[1]), 1), 30) : null;
}

/** Đọc ngân sách: "dưới 800k", "khoảng 1 triệu", "1tr5". */
function parseBudget(t: string): number | null {
  const tr = t.match(/(\d+(?:[.,]\d+)?)\s*(tr|trieu)/);
  if (tr) return Math.round(Number(tr[1].replace(",", ".")) * 1_000_000);
  const k = t.match(/(\d{2,4})\s*(k|nghin|ngan)/);
  if (k) return Number(k[1]) * 1000;
  const raw = t.match(/(\d{6,9})/);
  return raw ? Number(raw[1]) : null;
}

/** Đọc ngày nhận phòng: "tối nay", "mai", "cuối tuần", "20/9". */
function parseCheckIn(t: string): string {
  const today = toISODate(new Date());
  if (/\b(mai|ngay mai|tomorrow)\b/.test(t)) return addDays(today, 1);
  if (/\b(mot ngay|ngay mot|hai ngay nua)\b/.test(t)) return addDays(today, 2);
  if (/\b(cuoi tuan|weekend|thu 7|thu bay|sat)\b/.test(t)) {
    const d = new Date();
    const delta = (6 - d.getDay() + 7) % 7 || 7; // thứ Bảy gần nhất
    return addDays(today, delta);
  }
  const dm = t.match(/(\d{1,2})[/\-](\d{1,2})/);
  if (dm) {
    const now = new Date();
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const year = month < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return iso >= today ? iso : today;
    }
  }
  return today;
}

const INITIAL_MSG: Msg = {
  id: nid(),
  role: "bot",
  text: "Kính chào Quý khách! Em là **Sao Mai Concierge** ạ. Em có thể tra phòng, báo giá, gợi ý lịch trình — Quý khách cần hỗ trợ gì trước ạ?",
  time: getTime(),
};

/* ========================================================================= */
/*  CSS-in-JS — Keyframes & styles injected once                             */
/* ========================================================================= */
const CHAT_STYLES_ID = "saomai-chat-styles-light";
function ensureChatStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CHAT_STYLES_ID)) return;
  const style = document.createElement("style");
  style.id = CHAT_STYLES_ID;
  style.textContent = `
/* ---- FAB pulse ring (light) ---- */
@keyframes smFabPulseLight {
  0%   { transform: scale(1);   opacity: 0.6; }
  70%  { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
.sm-fab-ring-light {
  animation: smFabPulseLight 2.8s cubic-bezier(0.22,1,0.36,1) infinite;
}

/* ---- Chat panel entrance ---- */
@keyframes smPanelIn {
  from { opacity: 0; transform: translateY(18px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
.sm-panel-enter {
  animation: smPanelIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
}

/* ---- Message fade-up ---- */
@keyframes smMsgIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sm-msg-enter {
  animation: smMsgIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards;
}

/* ---- Typing dots wave ---- */
@keyframes smDotWaveLight {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30%           { transform: translateY(-5px); opacity: 1; }
}
.sm-dot-light { animation: smDotWaveLight 1.4s ease-in-out infinite; background: #c2a265; }
.sm-dot-1 { animation-delay: 0s; }
.sm-dot-2 { animation-delay: 0.15s; }
.sm-dot-3 { animation-delay: 0.3s; }

/* ---- Offer card hover shine (light) ---- */
@keyframes smCardShineLight {
  0%   { left: -75%; }
  100% { left: 125%; }
}
.sm-offer-card-light:hover .sm-shine-light {
  animation: smCardShineLight 0.65s ease forwards;
}

/* ---- Ambient particles in header ---- */
@keyframes smFloatLight {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
  50%      { transform: translateY(-6px) scale(1.3); opacity: 0.6; }
}
.sm-particle-light {
  position: absolute; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%);
}

/* ---- Suggestion chip hover (light) ---- */
.sm-chip-light {
  position: relative; overflow: hidden;
  transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
}
.sm-chip-light::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(227,197,139,0.15), rgba(194,162,101,0.15));
  opacity: 0; transition: opacity 0.25s;
}
.sm-chip-light:hover::before { opacity: 1; }
.sm-chip-light:hover {
  border-color: rgba(194,162,101,0.4) !important;
  color: #8a6d33 !important;
  background: #fff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(194,162,101,0.12);
}

/* ---- Scrollbar (thin, subtle, light) ---- */
.sm-scroll-light::-webkit-scrollbar { width: 4px; }
.sm-scroll-light::-webkit-scrollbar-track { background: transparent; }
.sm-scroll-light::-webkit-scrollbar-thumb {
  background: rgba(194,162,101,0.2); border-radius: 4px;
}
.sm-scroll-light::-webkit-scrollbar-thumb:hover { background: rgba(194,162,101,0.4); }

/* ---- Input focus glow (light) ---- */
.sm-input-light:focus {
  border-color: #c2a265 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(194,162,101,0.1), 0 2px 12px rgba(194,162,101,0.06);
}
`;
  document.head.appendChild(style);
}

/**
 * Chatbot hỗ trợ & đặt phòng 24/7 — giao diện "Ngọc Trai & Sương Mai":
 * Thanh lịch, sáng sủa, tạo cảm giác tinh khôi, sang trọng nhẹ nhàng.
 */
export function BookingChat({ onOpenLegal }: { onOpenLegal?: () => void }) {
  const { roomTypes, getAvailableRooms, quoteFor, services, rooms } = useStore();
  const [open, setOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState<{ type: RoomType; offer: Offer } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([INITIAL_MSG]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Inject keyframe styles once
  useEffect(() => { ensureChatStyles(); }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking, open]);

  const resetChat = () => {
    setMsgs([{ ...INITIAL_MSG, id: nid(), time: getTime() }]);
  };

  // Tạo đề xuất phòng thực tế từ yêu cầu
  const extractOffers = (q: string): Offer[] => {
    const t = noAccent(q);
    const guests = parseGuests(t) ?? 2;
    const nights = parseNights(t) ?? 1;
    const budget = parseBudget(t);
    const checkIn = parseCheckIn(t);
    const checkOut = addDays(checkIn, nights);

    const available = getAvailableRooms(checkIn, checkOut, guests);
    if (available.length === 0) return [];

    const byType = new Map<string, string>();
    available.forEach((r) => {
      if (!byType.has(r.typeId)) byType.set(r.typeId, r.id);
    });

    let offers = Array.from(byType.entries()).map(([typeId, roomId]) => {
      const type = roomTypes.find((x) => x.id === typeId);
      const quote = quoteFor(typeId, checkIn, checkOut);
      const perNight = quote ? quote.avgPerNight : (type?.basePrice ?? 0);
      return {
        typeId,
        roomId,
        perNight,
        total: quote ? quote.total : perNight * nights,
        checkIn,
        checkOut,
        guests,
        nights,
      };
    });

    if (budget) {
      const fit = offers.filter((o) => o.perNight <= budget * 1.05);
      if (fit.length > 0) offers = fit;
    }

    offers.sort((a, b) => a.perNight - b.perNight);
    return offers.slice(0, 3);
  };

  const send = async (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q || thinking) return;

    const userMsg: Msg = { id: nid(), role: "user", text: q, time: getTime() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setThinking(true);

    try {
      const today = toISODate(new Date());
      const avail = getAvailableRooms(today, addDays(today, 1));

      const hotelContext: HotelContext = {
        hotelName: HOTEL_NAME || "Sao Mai Hotel & Residences",
        totalRooms: rooms.length,
        availableRoomsCount: avail.length,
        roomTypesSummary: roomTypes
          .map(
            (t) =>
              `${t.name} (Giá từ ${formatVND(t.basePrice)}/đêm, Sức chứa: ${t.capacity} khách, Diện tích: ${t.size ? t.size + "m²" : "chưa có diện tích"}, Tiện nghi: ${t.amenities.join(", ")})`
          )
          .join("; "),
        servicesSummary: services.map((s) => `${s.name}: ${formatVND(s.price)}`).join("; "),
        todayStats: `Hôm nay có ${avail.length}/${rooms.length} phòng trống.`,
      };

      const history = newMsgs.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        text: m.text,
      }));

      const replyText = await askGemini(q, history, hotelContext);
      const offers = isRoomIntent(noAccent(q)) ? extractOffers(q) : [];

      setMsgs((m) => [...m, { id: nid(), role: "bot", text: replyText, offers, time: getTime() }]);
    } catch (err) {
      console.warn("[BookingChat] Lỗi:", err);
      const roomIntent = isRoomIntent(noAccent(q));
      const offers = roomIntent ? extractOffers(q) : [];
      setMsgs((m) => [
        ...m,
        {
          id: nid(),
          role: "bot",
          text:
            offers.length > 0
              ? "Dạ, em tìm thấy vài hạng phòng còn trống phù hợp với yêu cầu của Quý khách bên dưới ạ:"
              : roomIntent
                ? "Dạ rất tiếc hiện không có phòng trống khớp yêu cầu này. Quý khách thử đổi ngày hoặc số khách giúp em nhé."
                : `Dạ về câu hỏi "**${q}**", hiện kết nối của em đang chậm nên chưa trả lời chính xác được. Quý khách vui lòng thử gửi lại giúp em nhé.`,
          offers,
          time: getTime(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const choose = (o: Offer) => {
    const type = roomTypes.find((x) => x.id === o.typeId);
    if (type) setPicked({ type, offer: o });
  };

  /* Ambient floating particles for the header */
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 4,
    }));
  }, []);

  return (
    <>
      {/* ================================================================== */}
      {/*  NÚT MỞ CHAT — FAB Pearl theme                                     */}
      {/* ================================================================== */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý" : "Mở trợ lý Sao Mai"}
        className="fixed bottom-5 right-5 z-50 grid place-items-center cursor-pointer"
        style={{
          width: 56, height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #fcfaf7 0%, #f4efe7 100%)",
          border: "1px solid rgba(194,162,101,0.2)",
          boxShadow: open
            ? "0 4px 16px rgba(0,0,0,0.1)"
            : "0 10px 30px rgba(0,0,0,0.15), 0 2px 10px rgba(194,162,101,0.15)",
          transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = open ? "scale(0.92)" : "scale(1)"; }}
      >
        {/* Pulse rings — only when closed */}
        {!open && (
          <>
            <span
              className="sm-fab-ring-light"
              style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "2px solid rgba(194,162,101,0.25)",
              }}
            />
            <span
              className="sm-fab-ring-light"
              style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                border: "2px solid rgba(194,162,101,0.15)",
                animationDelay: "0.7s",
              }}
            />
          </>
        )}
        {/* Icon with rotation transition */}
        <span
          style={{
            position: "relative", display: "grid", placeItems: "center",
            transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), color 0.3s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: open ? "#6e675e" : "#8a6d33",
          }}
        >
          {open ? <X size={22} strokeWidth={2} /> : <MessageCircle size={22} strokeWidth={1.5} />}
        </span>
        {/* Online dot */}
        {!open && (
          <span
            style={{
              position: "absolute", top: 2, right: 2,
              width: 10, height: 10, borderRadius: "50%",
              background: "#4b7a5a", // lux-success
              border: "2px solid #fff",
              boxShadow: "0 0 6px rgba(75,122,90,0.4)",
            }}
          />
        )}
      </button>

      {/* ================================================================== */}
      {/*  BẢNG CHAT — Floating panel Pearl Theme                            */}
      {/* ================================================================== */}
      {open && (
        <div
          className="sm-panel-enter fixed z-50 flex flex-col overflow-hidden"
          style={{
            bottom: 88, right: 20,
            width: "min(400px, 92vw)",
            maxHeight: "min(640px, 78vh)",
            borderRadius: 20,
            background: "rgba(252, 250, 247, 0.92)", /* lux-ivory with transparency */
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(194,162,101,0.25)", /* lux-champagne soft */
            boxShadow:
              "0 24px 64px -12px rgba(15, 13, 11, 0.2), " + /* shadow-lg */
              "0 4px 12px rgba(15, 13, 11, 0.05), " +
              "inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          {/* ========== HEADER — Pearl Dawn ========== */}
          <div
            style={{
              position: "relative", overflow: "hidden", flexShrink: 0,
              padding: "16px 16px 14px",
              background: "linear-gradient(135deg, rgba(244, 239, 231, 0.8) 0%, rgba(252, 250, 247, 0.9) 100%)",
              borderBottom: "1px solid rgba(194,162,101,0.15)",
              zIndex: 10,
            }}
          >
            {/* Horizon glow line */}
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(194,162,101,0.3) 50%, transparent)",
              }}
            />
            {/* Ambient particles */}
            {particles.map((p, i) => (
              <div
                key={i}
                className="sm-particle-light"
                style={{
                  left: p.left, top: p.top,
                  width: p.size, height: p.size,
                  animation: `smFloatLight ${p.duration}s ease-in-out infinite`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
            
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center",
                  background: "#fff",
                  border: "1px solid rgba(194,162,101,0.3)",
                  boxShadow: "0 2px 8px rgba(194,162,101,0.15)",
                }}
              >
                <Sparkles size={18} color="#c2a265" />
              </div>
              {/* Title */}
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                    fontSize: 17, fontWeight: 700, letterSpacing: "0.01em",
                    color: "#1c1917", /* lux-ink */
                  }}
                >
                  Sao Mai Concierge
                </div>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: "#6e675e", /* lux-stone */
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                      background: "#4b7a5a",
                      boxShadow: "0 0 6px rgba(75,122,90,0.3)",
                    }}
                  />
                  <span>Trực tuyến 24/7</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <ShieldCheck size={11} color="#c2a265" />
                  <span>Hỗ trợ bởi AI</span>
                </div>
              </div>
              {/* Header actions */}
              <div style={{ display: "flex", gap: 2 }}>
                <HeaderBtn onClick={resetChat} title="Bắt đầu lại">
                  <RotateCcw size={14} />
                </HeaderBtn>
                <HeaderBtn onClick={() => setOpen(false)} title="Đóng">
                  <X size={15} />
                </HeaderBtn>
              </div>
            </div>
          </div>

          {/* ========== MESSAGE STREAM ========== */}
          <div
            ref={scrollRef}
            className="sm-scroll-light"
            style={{
              flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 14px",
              display: "flex", flexDirection: "column", gap: 16,
              backgroundImage:
                "radial-gradient(circle at top right, rgba(194,162,101,0.03), transparent 70%), " +
                "radial-gradient(circle at bottom left, rgba(194,162,101,0.03), transparent 70%)",
            }}
          >
            {msgs.map((m, idx) => (
              <div
                key={m.id}
                className="sm-msg-enter"
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  animationDelay: `${Math.min(idx * 0.05, 0.25)}s`,
                }}
              >
                {m.role === "user" ? (
                  /* ---- USER BUBBLE ---- */
                  <div
                    style={{
                      maxWidth: "82%", borderRadius: "16px 16px 4px 16px",
                      padding: "10px 14px",
                      fontSize: 13.5, fontWeight: 500, lineHeight: 1.55,
                      color: "#fff",
                      background: "linear-gradient(135deg, #c2a265 0%, #8a6d33 100%)",
                      boxShadow: "0 4px 12px rgba(138,109,51,0.25)",
                    }}
                  >
                    <DawnText text={m.text} isUser />
                  </div>
                ) : (
                  /* ---- BOT BUBBLE ---- */
                  <div style={{ display: "flex", maxWidth: "94%", gap: 8, alignItems: "flex-start" }}>
                    {/* Bot avatar (small) */}
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        display: "grid", placeItems: "center",
                        background: "#fff",
                        border: "1px solid rgba(194,162,101,0.25)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                      }}
                    >
                      <Sparkles size={12} color="#c2a265" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Text bubble */}
                      <div
                        style={{
                          borderRadius: "4px 16px 16px 16px",
                          padding: "12px 14px",
                          fontSize: 13.5, lineHeight: 1.6,
                          color: "#1c1917", /* lux-ink */
                          background: "#fff",
                          border: "1px solid rgba(194,162,101,0.15)",
                          boxShadow: "0 2px 10px rgba(15,13,11,0.04)",
                        }}
                      >
                        <DawnText text={m.text} isUser={false} />
                      </div>

                      {/* ---- OFFER CARDS ---- */}
                      {m.offers && m.offers.length > 0 && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                          <div
                            style={{
                              fontFamily: "'Cormorant Garamond', Georgia, serif",
                              fontSize: 11, fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.15em",
                              color: "#8a6d33",
                              paddingLeft: 4,
                            }}
                          >
                            ✦ Hạng phòng phù hợp
                          </div>
                          {m.offers.map((o) => (
                            <OfferCard
                              key={o.typeId}
                              offer={o}
                              type={roomTypes.find((x) => x.id === o.typeId)}
                              onChoose={() => choose(o)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                {m.time && (
                  <span
                    style={{
                      marginTop: 4, paddingLeft: 4, paddingRight: 4,
                      fontSize: 10,
                      color: "#6e675e",
                    }}
                  >
                    {m.time}
                  </span>
                )}
              </div>
            ))}

            {/* ---- TYPING INDICATOR ---- */}
            {thinking && (
              <div className="sm-msg-enter" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    display: "grid", placeItems: "center",
                    background: "#fff",
                    border: "1px solid rgba(194,162,101,0.25)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <Bot size={13} color="#c2a265" />
                </div>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    borderRadius: "4px 16px 16px 16px",
                    padding: "12px 16px",
                    background: "#fff",
                    border: "1px solid rgba(194,162,101,0.1)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  }}
                >
                  <span className="sm-dot-light sm-dot-1" style={{ width: 5, height: 5, borderRadius: "50%" }} />
                  <span className="sm-dot-light sm-dot-2" style={{ width: 5, height: 5, borderRadius: "50%" }} />
                  <span className="sm-dot-light sm-dot-3" style={{ width: 5, height: 5, borderRadius: "50%" }} />
                  <span style={{ marginLeft: 4, fontSize: 11, color: "#6e675e", fontWeight: 500 }}>
                    Đang soạn…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========== QUICK SUGGESTIONS — horizontal scroll ========== */}
          <div
            style={{
              background: "rgba(252,250,247,0.6)",
              padding: "10px 14px",
              flexShrink: 0,
            }}
          >
            <div
              className="sm-scroll-light"
              style={{
                display: "flex", gap: 6, overflowX: "auto",
                paddingBottom: 4, /* room for scrollbar */
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={thinking}
                  className="sm-chip-light"
                  style={{
                    flexShrink: 0, whiteSpace: "nowrap",
                    borderRadius: 9999, cursor: "pointer",
                    border: "1px solid rgba(194,162,101,0.3)",
                    background: "#f4efe7",
                    padding: "7px 14px",
                    fontSize: 11, fontWeight: 500, color: "#3a3531",
                    opacity: thinking ? 0.4 : 1,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* ========== INPUT BAR ========== */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
              borderTop: "1px solid rgba(194,162,101,0.15)",
              background: "#fff",
              padding: "12px 14px",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.02)",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của Quý khách..."
              className="sm-input-light"
              style={{
                flex: 1,
                borderRadius: 9999,
                border: "1px solid rgba(194,162,101,0.25)",
                background: "#fcfaf7",
                padding: "10px 18px",
                fontSize: 13.5,
                color: "#1c1917",
                outline: "none",
                transition: "all 0.25s",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Gửi tin nhắn"
              style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                display: "grid", placeItems: "center",
                background: (!input.trim() || thinking)
                  ? "#f4efe7"
                  : "linear-gradient(135deg, #c2a265, #8a6d33)",
                color: (!input.trim() || thinking) ? "#a39b90" : "#fff",
                border: (!input.trim() || thinking) ? "1px solid rgba(194,162,101,0.2)" : "none",
                cursor: (!input.trim() || thinking) ? "not-allowed" : "pointer",
                boxShadow: (!input.trim() || thinking) ? "none" : "0 4px 12px rgba(138,109,51,0.3)",
                transition: "all 0.2s ease",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => { if (input.trim() && !thinking) e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {thinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} style={{ marginLeft: 2 }} />}
            </button>
          </form>
        </div>
      )}

      {/* POPUP HOÀN TẤT ĐẶT PHÒNG */}
      {picked && (
        <BookingFlow
          type={picked.type}
          roomId={picked.offer.roomId}
          checkIn={picked.offer.checkIn}
          checkOut={picked.offer.checkOut}
          guests={picked.offer.guests}
          nights={Math.max(nightsBetween(picked.offer.checkIn, picked.offer.checkOut), 1)}
          onClose={() => setPicked(null)}
          onOpenLegal={onOpenLegal}
        />
      )}
    </>
  );
}

/* ========================================================================= */
/*  OfferCard — Thẻ đề xuất phòng Pearl Theme                               */
/* ========================================================================= */
function OfferCard({
  offer,
  type,
  onChoose,
}: {
  offer: Offer;
  type?: RoomType;
  onChoose: () => void;
}) {
  return (
    <div
      className="sm-offer-card-light"
      style={{
        position: "relative", overflow: "hidden",
        display: "flex",
        borderRadius: 14,
        border: "1px solid rgba(194,162,101,0.25)",
        background: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(194,162,101,0.5)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(194,162,101,0.15), 0 0 0 1px rgba(194,162,101,0.1)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(194,162,101,0.25)";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Hover shine sweep */}
      <div
        className="sm-shine-light"
        style={{
          position: "absolute", top: 0, left: "-75%",
          width: "50%", height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(194,162,101,0.1), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Body */}
      <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 14, fontWeight: 700, color: "#1c1917",
          }}
        >
          <BedDouble size={14} color="#8a6d33" style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {type?.name ?? "Hạng phòng"}
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: "#6e675e", display: "flex", gap: 6, fontWeight: 500 }}>
          <span>{type?.capacity ?? offer.guests} khách</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{type?.size ?? 35}m²</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{offer.nights} đêm</span>
        </div>
      </div>

      {/* Perforated tear line */}
      <div style={{ position: "relative", width: 1, flexShrink: 0, alignSelf: "stretch" }}>
        <div
          style={{
            position: "absolute", inset: "0", width: 1,
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(194,162,101,0.25) 0px, rgba(194,162,101,0.25) 3px, transparent 3px, transparent 7px)",
          }}
        />
        <span
          style={{
            position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, borderRadius: "50%",
            background: "rgba(252, 250, 247, 0.95)",
            boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.03)",
            borderBottom: "1px solid rgba(194,162,101,0.15)",
          }}
        />
        <span
          style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, borderRadius: "50%",
            background: "rgba(252, 250, 247, 0.95)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
            borderTop: "1px solid rgba(194,162,101,0.15)",
          }}
        />
      </div>

      {/* Stub — price & CTA */}
      <div
        style={{
          width: "35%", flexShrink: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 6, padding: "10px 8px",
          textAlign: "center",
          background: "rgba(244, 239, 231, 0.4)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 13, fontWeight: 700,
              color: "#8a6d33",
            }}
          >
            {formatVND(offer.perNight)}
          </div>
          <div style={{ fontSize: 9, color: "#6e675e", marginTop: 1 }}>/ đêm</div>
        </div>
        <button
          onClick={onChoose}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 10, fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(135deg, #c2a265, #8a6d33)",
            border: "none",
            boxShadow: "0 3px 10px rgba(138,109,51,0.3)",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 5px 14px rgba(138,109,51,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 3px 10px rgba(138,109,51,0.3)";
          }}
        >
          Giữ phòng <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  HeaderBtn — small header action button (Light Theme)                     */
/* ========================================================================= */
function HeaderBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        display: "grid", placeItems: "center",
        background: "transparent",
        color: "#6e675e",
        border: "none", cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(194,162,101,0.15)";
        e.currentTarget.style.color = "#8a6d33";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#6e675e";
      }}
    >
      {children}
    </button>
  );
}

/* ========================================================================= */
/*  DawnText — renders **bold** and bullet lists in Pearl theme              */
/* ========================================================================= */
function DawnText({ text, isUser }: { text: string; isUser: boolean }) {
  const formatted = text.split("\n").map((line, lineIdx) => {
    const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
    const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, "") : line;

    return (
      <p
        key={lineIdx}
        style={{
          margin: 0,
          marginTop: lineIdx === 0 ? 0 : 6,
          display: isBullet ? "flex" : "block",
          alignItems: isBullet ? "flex-start" : undefined,
          gap: isBullet ? 6 : undefined,
        }}
      >
        {isBullet && (
          <span
            style={{
              fontSize: 10, lineHeight: "22px",
              color: isUser ? "#fff" : "#c2a265",
              userSelect: "none", flexShrink: 0,
            }}
          >
            ✦
          </span>
        )}
        <span>
          {cleanLine.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong
                key={i}
                style={{
                  fontWeight: 700,
                  color: isUser ? "#fff" : "#8a6d33",
                }}
              >
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </span>
      </p>
    );
  });

  return <div>{formatted}</div>;
}