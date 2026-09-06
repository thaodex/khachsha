import { useState } from "react";
import { Clock, MapPin, Phone } from "lucide-react";
import type { LegalDoc } from "./LegalPages";

/** Footer tối màu kiểu resort: thông tin liên hệ rõ ràng + đăng ký ưu đãi. */
export function LuxFooter({
  hotelName,
  isGuest,
  onNav,
  onOpenLegal,
  onMyBookings,
  onLogin,
}: {
  hotelName: string;
  isGuest: boolean;
  onNav: (id: string) => void;
  onOpenLegal: (doc: LegalDoc) => void;
  onMyBookings: () => void;
  onLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const initials = hotelName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <footer id="contact" className="lux-footer" style={{ scrollMarginTop: 90 }}>
      <div className="lux-shell lux-shell--wide">
        <div className="lux-footer__grid">
          <div>
            <div className="lux-brand" style={{ color: "#fff" }}>
              <span className="lux-brand__mark">{initials}</span>
              <span>
                <span className="lux-brand__name">{hotelName}</span>
                <br />
                <span className="lux-brand__tag">Hotel &amp; Residences</span>
              </span>
            </div>
            <p style={{ marginTop: 18, maxWidth: "38ch", fontSize: ".9375rem", lineHeight: 1.7 }}>
              Khách sạn bên bờ biển với phòng và suite hướng biển. Đặt trực tiếp để nhận giá tốt nhất
              — giữ phòng chỉ với một khoản cọc nhỏ.
            </p>

            <form
              className="lux-newsletter"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <label className="lux-sr" htmlFor="lux-newsletter">Email nhận ưu đãi</label>
              <input
                id="lux-newsletter"
                type="email"
                required
                placeholder="Email nhận ưu đãi riêng"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSent(false); }}
              />
              <button type="submit">Đăng ký</button>
            </form>
            {sent && (
              <p style={{ marginTop: 10, fontSize: ".8125rem", color: "var(--lux-champagne)" }} role="status">
                Chức năng đăng ký email chưa kết nối máy chủ. Email của bạn chưa được gửi hoặc lưu.
              </p>
            )}
          </div>

          <div>
            <h4>Khám phá</h4>
            <ul className="lux-footer__list">
              <li><button type="button" onClick={() => onNav("rooms")}>Phòng &amp; Suite</button></li>
              <li><button type="button" onClick={() => onNav("experiences")}>Trải nghiệm</button></li>
              <li><button type="button" onClick={() => onNav("services")}>Dịch vụ</button></li>
              <li><button type="button" onClick={() => onNav("offers")}>Ưu đãi</button></li>
            </ul>
          </div>

          <div>
            <h4>Hỗ trợ</h4>
            <ul className="lux-footer__list">
              <li>
                <button type="button" onClick={isGuest ? onMyBookings : onLogin}>
                  Đặt phòng của tôi
                </button>
              </li>
              <li><button type="button" onClick={() => onOpenLegal("terms")}>Điều khoản &amp; chính sách huỷ</button></li>
              <li><button type="button" onClick={() => onOpenLegal("privacy")}>Bảo mật</button></li>
              <li><button type="button" onClick={onLogin}>Đăng nhập nội bộ</button></li>
            </ul>
          </div>

          <div>
            <h4>Liên hệ</h4>
            <ul className="lux-footer__list">
              <li className="lux-footer__row"><Phone className="size-4" /> Hotline 24/7: 0900 000 000</li>
              <li className="lux-footer__row"><MapPin className="size-4" /> 123 Đường Biển, TP. Hồ Chí Minh</li>
              <li className="lux-footer__row"><Clock className="size-4" /> Nhận phòng 14:00 · Trả phòng 12:00</li>
            </ul>
          </div>
        </div>

        <div className="lux-footer__bottom">
          <span>© 2026 {hotelName}. Mọi quyền được bảo lưu.</span>
          <div className="lux-footer__legal">
            <button type="button" className="lux-linkline" onClick={() => onOpenLegal("terms")}>Điều khoản</button>
            <button type="button" className="lux-linkline" onClick={() => onOpenLegal("privacy")}>Bảo mật</button>
            <button type="button" className="lux-linkline" onClick={() => onOpenLegal("rights")}>Quyền của bạn</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
