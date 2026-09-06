/**
 * Module AI tách riêng — dễ thay provider.
 *
 * Hiện dùng "MockProvider" (chạy offline, không cần API key) để demo ngay.
 * Muốn dùng provider thật (vd Claude/OpenAI), chỉ cần tạo một object thỏa
 * interface `AIProvider` rồi gán vào `activeProvider` bên dưới — phần UI
 * không cần đổi.
 */
import { Room, RoomType } from "./types";
import { formatVND } from "./format";

export interface RoomSuggestionInput {
  budgetPerNight?: number;
  guests: number;
  nights: number;
  preferences?: string;
  /** DANH SÁCH PHÒNG TRỐNG THỰC TẾ — AI chỉ được gợi ý trong danh sách này */
  availableRooms: { room: Room; type: RoomType }[];
}

export interface RoomSuggestion {
  roomId: string;
  reason: string;
}

export interface RoomSuggestionResult {
  intro: string;
  suggestions: RoomSuggestion[];
  fallback?: string;
}

export type EmailKind = "confirmation" | "cancellation" | "payment_reminder";

export interface EmailInput {
  kind: EmailKind;
  customerName: string;
  hotelName: string;
  bookingCode: string;
  roomLabel: string;
  checkIn: string;
  checkOut: string;
  amountDue?: number;
}

export interface OccupancyInput {
  occupancyRate: number; // 0..1
  revenueToday: number;
  availableRooms: number;
  totalRooms: number;
  trend: "up" | "down" | "flat";
}

export interface AIProvider {
  name: string;
  suggestRooms(input: RoomSuggestionInput): Promise<RoomSuggestionResult>;
  draftEmail(input: EmailInput): Promise<string>;
  occupancyInsight(input: OccupancyInput): Promise<string>;
}

// Giả lập độ trễ mạng + khả năng timeout để UI có loading/fallback thực tế.
function delay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const MockProvider: AIProvider = {
  name: "MockProvider (offline)",

  async suggestRooms(input) {
    const { availableRooms, budgetPerNight, guests, nights, preferences } = input;

    const viable = availableRooms
      .filter((r) => r.type.capacity >= guests)
      .filter((r) => (budgetPerNight ? r.type.basePrice <= budgetPerNight * 1.1 : true))
      .sort((a, b) => {
        // ưu tiên sát ngân sách và đủ chỗ, không quá dư sức chứa
        const score = (x: typeof a) =>
          (budgetPerNight ? Math.abs(x.type.basePrice - budgetPerNight) : x.type.basePrice) +
          (x.type.capacity - guests) * 50000;
        return score(a) - score(b);
      });

    if (viable.length === 0) {
      return delay({
        intro: "Rất tiếc, hiện không có phòng trống nào khớp yêu cầu của bạn.",
        suggestions: [],
        fallback:
          "Gợi ý: nới ngân sách, giảm số khách, hoặc chọn ngày khác để có thêm lựa chọn phòng.",
      });
    }

    const top = viable.slice(0, 3);
    return delay({
      intro: `Dựa trên ${guests} khách, ${nights} đêm${
        budgetPerNight ? ` và ngân sách ~${formatVND(budgetPerNight)}/đêm` : ""
      }, đây là các phòng trống phù hợp nhất:`,
      suggestions: top.map((r) => ({
        roomId: r.room.id,
        reason: `Phòng ${r.room.number} (${r.type.name}) — ${formatVND(
          r.type.basePrice,
        )}/đêm, sức chứa ${r.type.capacity} khách. Tổng ~${formatVND(
          r.type.basePrice * nights,
        )} cho ${nights} đêm.${
          preferences && r.type.amenities.some((a) => preferences.toLowerCase().includes(a.toLowerCase()))
            ? " Có tiện ích bạn quan tâm."
            : ""
        }`,
      })),
    });
  },

  async draftEmail(input) {
    const { kind, customerName, hotelName, bookingCode, roomLabel, checkIn, checkOut, amountDue } = input;
    let body = "";
    if (kind === "confirmation") {
      body = `Kính gửi Quý khách ${customerName},

Cảm ơn Quý khách đã đặt phòng tại ${hotelName}. Chúng tôi xin xác nhận thông tin đặt phòng:

• Mã đặt phòng: ${bookingCode}
• Phòng: ${roomLabel}
• Nhận phòng: ${checkIn}
• Trả phòng: ${checkOut}

Giờ nhận phòng từ 14:00, trả phòng trước 12:00. Nếu cần hỗ trợ thêm, vui lòng phản hồi email này.

Trân trọng,
${hotelName}`;
    } else if (kind === "cancellation") {
      body = `Kính gửi Quý khách ${customerName},

Chúng tôi xác nhận đã HỦY đặt phòng ${bookingCode} (Phòng ${roomLabel}, ${checkIn} → ${checkOut}) theo yêu cầu của Quý khách.

Nếu có khoản hoàn tiền, bộ phận kế toán sẽ xử lý trong 3–5 ngày làm việc. Rất mong được đón tiếp Quý khách trong dịp khác.

Trân trọng,
${hotelName}`;
    } else {
      body = `Kính gửi Quý khách ${customerName},

Chúng tôi xin nhắc về khoản thanh toán còn lại cho đặt phòng ${bookingCode} (Phòng ${roomLabel}, ${checkIn} → ${checkOut}).

• Số tiền cần thanh toán: ${amountDue ? formatVND(amountDue) : "(cập nhật)"}

Quý khách vui lòng hoàn tất thanh toán khi trả phòng hoặc qua chuyển khoản. Xin cảm ơn!

Trân trọng,
${hotelName}`;
    }
    return delay(body);
  },

  async occupancyInsight(input) {
    const pct = Math.round(input.occupancyRate * 100);
    const trendText =
      input.trend === "up" ? "đang tăng" : input.trend === "down" ? "đang giảm" : "ổn định";
    const comment = `Công suất phòng hiện ~${pct}% (${input.totalRooms - input.availableRooms}/${input.totalRooms} phòng), xu hướng ${trendText}. Doanh thu hôm nay ${formatVND(input.revenueToday)}.`;
    let promo = "";
    if (pct < 50) {
      promo =
        "Gợi ý khuyến mãi: giảm 15–20% cho khách đặt tối thiểu 2 đêm, hoặc combo 'ở 3 tính tiền 2' để lấp phòng trống giữa tuần.";
    } else if (pct < 80) {
      promo =
        "Gợi ý: bán thêm dịch vụ (bữa sáng, đưa đón), ưu đãi nâng hạng phòng có thu phí để tăng doanh thu trung bình/khách.";
    } else {
      promo =
        "Công suất cao — nên tối ưu giá theo mùa (dynamic pricing) và giữ vài phòng cho khách trung thành/đặt phút chót giá cao.";
    }
    return delay(`${comment}\n\n${promo}`, 700);
  },
};

import { askGemini } from "./gemini";

export const GeminiProvider: AIProvider = {
  name: "Google Gemini (Trực tuyến)",

  async suggestRooms(input) {
    try {
      const roomListStr = input.availableRooms
        .map(
          (r) =>
            `- ID: ${r.room.id}, Phòng ${r.room.number} (${r.type.name}), Giá: ${formatVND(r.type.basePrice)}/đêm, Sức chứa: ${r.type.capacity} khách, Tiện nghi: ${r.type.amenities.join(", ")}`
        )
        .join("\n");

      const prompt = `Khách hàng yêu cầu tìm phòng:
- Số khách: ${input.guests}
- Số đêm: ${input.nights}
${input.budgetPerNight ? `- Ngân sách: ~${formatVND(input.budgetPerNight)}/đêm` : ""}
${input.preferences ? `- Sở thích/Yêu cầu: ${input.preferences}` : ""}

Danh sách phòng trống thực tế hiện có:
${roomListStr || "Không có phòng trống"}

Hãy phân tích và trả về định dạng JSON duy nhất với cấu trúc:
{
  "intro": "Câu mở đầu ngắn gọn lịch sự",
  "suggestions": [
    { "roomId": "id_phong_chinh_xac_trong_danh_sach", "reason": "Lý do vì sao phòng này phù hợp nhất" }
  ],
  "fallback": "Gợi ý thêm nếu không có phòng khớp"
}`;

      const res = await askGemini(prompt);
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && Array.isArray(parsed.suggestions)) {
          return parsed;
        }
      }
    } catch {
      // Tự động fallback sang MockProvider nếu gặp lỗi mạng hoặc quota
    }
    return MockProvider.suggestRooms(input);
  },

  async draftEmail(input) {
    try {
      const prompt = `Soạn một email khách sạn chuyên nghiệp, ấm áp và trang trọng:
- Loại email: ${input.kind === "confirmation" ? "Xác nhận đặt phòng" : input.kind === "cancellation" ? "Xác nhận hủy phòng" : "Nhắc nhở thanh toán"}
- Tên khách hàng: ${input.customerName}
- Tên khách sạn: ${input.hotelName}
- Mã đặt phòng: ${input.bookingCode}
- Phòng: ${input.roomLabel}
- Nhận phòng: ${input.checkIn} (từ 14:00)
- Trả phòng: ${input.checkOut} (trước 12:00)
${input.amountDue ? `- Số tiền còn lại cần thanh toán: ${formatVND(input.amountDue)}` : ""}

Chỉ trả về nội dung hoàn chỉnh của bức thư bằng tiếng Việt chuẩn mực, không kèm lời bình giải thích.`;
      const res = await askGemini(prompt);
      if (res && res.trim().length > 30) return res.trim();
    } catch {
      // fallback
    }
    return MockProvider.draftEmail(input);
  },

  async occupancyInsight(input) {
    try {
      const prompt = `Phân tích tình hình kinh doanh và đưa ra chiến lược tối ưu doanh thu cho khách sạn:
- Công suất phòng hiện tại: ${Math.round(input.occupancyRate * 100)}%
- Doanh thu hôm nay: ${formatVND(input.revenueToday)}
- Phòng trống: ${input.availableRooms}/${input.totalRooms}
- Xu hướng: ${input.trend === "up" ? "Tăng" : input.trend === "down" ? "Giảm" : "Ổn định"}

Đưa ra nhận xét súc tích và 2-3 gợi ý hành động chiến lược cụ thể (khuyến mãi, upsell hoặc điều chỉnh giá) để đạt doanh thu tối đa.`;
      const res = await askGemini(prompt);
      if (res && res.trim().length > 30) return res.trim();
    } catch {
      // fallback
    }
    return MockProvider.occupancyInsight(input);
  },
};

// ⇩ Kích hoạt Gemini làm AI Provider chính (có tự động fallback an toàn)
export const activeProvider: AIProvider = GeminiProvider;
