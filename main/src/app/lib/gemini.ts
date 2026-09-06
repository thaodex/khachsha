/**
 * Dịch vụ tích hợp Google Gemini AI — Mở khóa toàn diện (Full AI Assistant & Concierge)
 * - Tự động kết nối Google Gemini 3.5 Flash / 3.1 Flash Lite
 * - Mở khóa toàn bộ chủ đề: đời sống, du lịch, lập trình, thơ văn, kiến thức, ẩm thực...
 * - Tích hợp đầy đủ dữ liệu thực tế của Khách sạn Sao Mai (phòng trống, giá, chính sách)
 */

export const DEFAULT_GEMINI_KEY = "AQ.Ab8RN6J4tJsxY6eW4p90JyulXc0Ftv1I2sD4TtihnxxnJfMIjQ";
const STORAGE_KEY = "smh.gemini.api_key";

export function getGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // Bỏ qua lỗi localStorage
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim()) return envKey.trim();
  return DEFAULT_GEMINI_KEY;
}

export function setGeminiApiKey(key: string) {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Bỏ qua lỗi
  }
}

export interface HotelContext {
  hotelName?: string;
  totalRooms?: number;
  availableRoomsCount?: number;
  roomTypesSummary?: string;
  servicesSummary?: string;
  todayStats?: string;
}

/**
 * Trợ lý thông minh dự phòng khi mất kết nối mạng
 */
export function generateSmartAIResponse(prompt: string, context?: HotelContext): string {
  const p = prompt.trim();
  const noAcc = p
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

  const hotel = context?.hotelName || "Sao Mai Hotel & Residences";

  // 1. Hỏi về giá phòng / các loại phòng (Ưu tiên cao nhất)
  if (
    noAcc.includes("gia") ||
    noAcc.includes("phong nao") ||
    noAcc.includes("loai phong") ||
    noAcc.includes("hang phong") ||
    noAcc.includes("bao gia") ||
    noAcc.includes("co nhung phong") ||
    noAcc.includes("phong trong") ||
    noAcc.includes("dat phong")
  ) {
    return `✨ **Bảng giá và các hạng phòng tại ${hotel}:**\n\n${context?.roomTypesSummary
        ? context.roomTypesSummary
          .split(";")
          .map((s) => `• **${s.trim()}**`)
          .join("\n")
        : "• **Deluxe Hướng Biển**: 1.200.000 đ/đêm (2 khách, 35m², ban công ngắm biển)\n• **Suite Hoàng Gia**: 2.500.000 đ/đêm (2 khách, 65m², bồn sục Jacuzzi)\n• **Family Panorama**: 3.500.000 đ/đêm (4-6 khách, 90m², view 360 độ)"
      }\n\n${context?.todayStats ? `💡 *${context.todayStats}*` : ""}\n\nQuý khách muốn đặt hạng phòng nào hoặc cần tư vấn thêm về ngày lưu trú không ạ?`;
  }

  // 2. Chào hỏi
  if (
    noAcc.includes("chao") ||
    noAcc.includes("hello") ||
    noAcc.includes("hi") ||
    noAcc.includes("alo") ||
    noAcc.includes("ban la ai") ||
    noAcc.includes("gioi thieu")
  ) {
    return `Kính chào Quý khách! 👋 Em là **Sao Mai AI Concierge** — Trợ lý ảo 5 sao của ${hotel}.\n\nEm sẵn sàng hỗ trợ Quý khách tra cứu giá phòng, tư vấn dịch vụ, gợi ý lịch trình du lịch hoặc giải đáp bất kỳ thắc mắc nào 24/7 ạ!`;
  }

  // 3. Giờ nhận / trả phòng
  if (noAcc.includes("gio nhan") || noAcc.includes("gio tra") || noAcc.includes("check in") || noAcc.includes("check out") || noAcc.includes("may gio")) {
    return `⏰ **Quy định giờ giấc tại ${hotel}:**\n\n• **Giờ nhận phòng (Check-in):** từ **14:00**\n• **Giờ trả phòng (Check-out):** trước **12:00** trưa\n\n*(Quý khách có nhu cầu nhận sớm hoặc trả muộn vui lòng thông báo trước để lễ tân sắp xếp theo tình trạng phòng)*.`;
  }

  // 4. Bữa sáng
  if (noAcc.includes("an sang") || noAcc.includes("buffet") || noAcc.includes("nha hang") || noAcc.includes("thuc don")) {
    return `🍳 **Ẩm thực & Buffet sáng 5 sao:**\n\nKhách sạn phục vụ **Buffet sáng chuẩn 5 sao miễn phí** từ **6:30 – 10:00** hàng ngày tại nhà hàng tầng thượng hướng biển, với thực đơn Á - Âu phong phú và quầy cà phê pha máy hảo hạng.`;
  }

  // 5. Chính sách hủy
  if (noAcc.includes("huy phong") || noAcc.includes("hoan tien") || noAcc.includes("chinh sach") || noAcc.includes("dieu khoan")) {
    return `📜 **Chính sách hủy & hoàn cọc tại ${hotel}:**\n\n• Hủy trước 7 ngày: **Hoàn 100% tiền cọc**\n• Hủy trước 3–7 ngày: **Hoàn 50% tiền cọc**\n• Hủy dưới 3 ngày: Không hoàn cọc`;
  }

  // 6. Du lịch & Lịch trình
  if (noAcc.includes("lich trinh") || noAcc.includes("di dau") || noAcc.includes("dia diem") || noAcc.includes("choi gi") || noAcc.includes("an gi")) {
    return `🌴 **Gợi ý lịch trình du lịch hấp dẫn:**\n\n1. **Sáng:** Thưởng thức buffet ngắm bình minh biển, check-in cung đường biển và ngọn hải đăng.\n2. **Chiều:** Tắm biển, chèo SUP hoặc thư giãn tại Spa của khách sạn.\n3. **Tối:** Thưởng thức hải sản tươi sống và ngắm toàn cảnh thành phố từ Sky Bar tầng thượng.`;
  }

  // 7. Thơ văn
  if (noAcc.includes("tho") || noAcc.includes("viet tho")) {
    return `🌊 *Gửi tặng Quý khách vần thơ biển vỗ:*\n\n*"Biển biếc nghiêng mình đón sớm mai,\nÁnh dương trải mạ dải miệt mài.\nGió lộng tầng mây ru giấc mộng,\nSao Mai tỏa sáng nét trang đài."* ✨`;
  }

  // 8. Dịch vụ đi kèm (đưa đón, giữ xe, trẻ em, thú cưng, giặt ủi...)
  if (
    noAcc.includes("dich vu") ||
    noAcc.includes("dua don") ||
    noAcc.includes("san bay") ||
    noAcc.includes("giu xe") ||
    noAcc.includes("do xe") ||
    noAcc.includes("tre em") ||
    noAcc.includes("thu cung") ||
    noAcc.includes("giat ui") ||
    noAcc.includes("ho boi") ||
    noAcc.includes("gym") ||
    noAcc.includes("spa")
  ) {
    return `🛎️ **Dịch vụ tại ${hotel}:**\n\n${context?.servicesSummary
        ? context.servicesSummary
          .split(";")
          .map((s) => `• ${s.trim()}`)
          .join("\n")
        : "• Đưa đón sân bay theo yêu cầu\n• Hồ bơi, Gym, Spa miễn phí cho khách lưu trú\n• Giữ xe, giặt ủi tính theo yêu cầu"
      }\n\nQuý khách cần đặt trước dịch vụ nào để em sắp xếp không ạ?`;
  }

  // 9. Khuyến mãi / ưu đãi
  if (noAcc.includes("khuyen mai") || noAcc.includes("uu dai") || noAcc.includes("giam gia") || noAcc.includes("voucher")) {
    return `🎁 **Ưu đãi hiện có tại ${hotel}:**\n\nQuý khách đặt trực tiếp qua Concierge sẽ được hỗ trợ báo giá tốt nhất theo ngày lưu trú thực tế. Quý khách cho em biết ngày nhận phòng và số đêm dự kiến để em kiểm tra ưu đãi phù hợp nhé.`;
  }

  // 10. Không khớp nhóm nào — vẫn phải bám sát nội dung câu hỏi, không dùng câu chào chung chung
  return `Dạ, về câu hỏi của Quý khách: **"${p}"** — hiện em chưa có đủ dữ liệu để trả lời thật chính xác phần này qua kênh dự phòng offline.\n\nQuý khách vui lòng hỏi lại cụ thể hơn (VD: giá phòng, giờ nhận/trả phòng, dịch vụ, chính sách hủy) hoặc thử gửi lại câu hỏi — em sẽ kết nối AI để trả lời chi tiết hơn ạ.`;
}

export async function askGemini(
  prompt: string,
  history: { role: "user" | "model"; text: string }[] = [],
  context?: HotelContext
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const systemInstruction = `Bạn là Sao Mai AI Concierge & Trợ lý thông minh cao cấp của Khách sạn Sao Mai (${context?.hotelName || "Sao Mai Hotel & Residences"}).

NGUYÊN TẮC PHẢN HỒI:
1. NGẮN GỌN, ĐỦ Ý — QUAN TRỌNG NHẤT:
   - Tối đa 4-5 câu hoặc 4-5 gạch đầu dòng ngắn cho MỖI câu trả lời. Không viết đoạn văn dài.
   - Mỗi ý chỉ 1 câu ngắn. Bỏ hết phần rào đón, lặp lại câu hỏi, hay giải thích thừa.
   - Nếu chủ đề thực sự cần nhiều thông tin (VD: liệt kê nhiều hạng phòng), ưu tiên gạch đầu dòng thay vì văn xuôi, mỗi dòng dưới 15 từ.
   - Không dùng emoji quá 1-2 lần trong 1 câu trả lời.

2. TRẢ LỜI ĐÚNG TRỌNG TÂM CÂU HỎI:
   - Khi người dùng hỏi về GIÁ PHÒNG, CÁC LOẠI PHÒNG, TÌNH TRẠNG PHÒNG TRỐNG: liệt kê ngắn gọn từng hạng phòng kèm giá/đêm, không mô tả dài dòng.
   - Khi người dùng hỏi về dịch vụ, giờ giấc, chính sách: trả lời trực tiếp, chính xác, ngắn gọn.
   - Khi người dùng hỏi về du lịch, ăn uống, đời sống, thơ ca, kiến thức: trả lời thông minh nhưng vẫn cô đọng.

3. THÔNG TIN THỰC TẾ CỦA KHÁCH SẠN:
   - Tên khách sạn: ${context?.hotelName || "Sao Mai Hotel & Residences (5 sao)"}
   - Giờ nhận phòng: 14:00 | Giờ trả phòng: 12:00
   ${context?.roomTypesSummary ? `- Danh sách hạng phòng & Báo giá: ${context.roomTypesSummary}` : ""}
   ${context?.servicesSummary ? `- Dịch vụ kèm theo: ${context.servicesSummary}` : ""}
   ${context?.todayStats ? `- Tình trạng phòng hôm nay: ${context.todayStats}` : ""}

4. PHONG CÁCH:
   - Lịch thiệp, ân cần, định dạng Markdown gọn gàng (in đậm tên phòng và giá tiền, gạch đầu dòng khi liệt kê).`;

  // Thứ tự model ưu tiên: alias ổn định trước (ít bị deprecate đột ngột),
  // sau đó mới tới các bản cụ thể — giảm khả năng rơi vào offline fallback.
  const models = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
  ];

  if (apiKey) {
    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const contents: any[] = [];
        const recentHistory = history.slice(-8);
        for (const h of recentHistory) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text }],
          });
        }

        contents.push({
          role: "user",
          parts: [{ text: prompt }],
        });

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 400,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && typeof text === "string" && text.trim()) {
            return text.trim();
          }
          // Phản hồi 200 nhưng rỗng (VD: bị chặn bởi safety filter) — thử model kế tiếp
          console.warn(`[gemini] Model ${model} trả về nội dung rỗng, thử model kế tiếp.`);
        } else {
          // Ghi log để dev biết vì sao rơi về offline fallback (sai key, hết quota, model không tồn tại...)
          const errBody = await response.text().catch(() => "");
          console.warn(`[gemini] Model ${model} lỗi ${response.status}: ${errBody.slice(0, 300)}`);
        }
      } catch (err) {
        console.warn(`[gemini] Model ${model} gọi thất bại:`, err);
        continue;
      }
    }
    console.warn("[gemini] Tất cả model đều thất bại — dùng offline fallback (trả lời theo từ khóa, không phải AI thật).");
  }

  // Fallback an toàn nếu mất mạng / hết quota / key sai
  return generateSmartAIResponse(prompt, context);
}