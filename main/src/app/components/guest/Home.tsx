import { useMemo, useState } from "react";
import {
  Bath, BedDouble, Briefcase, Car, Check, ConciergeBell, Flower2, Coffee,
  Shirt, Star, Tv, Users2, UtensilsCrossed, Waves, Wifi, Wind, Wine,
} from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { HOTEL_NAME, useStore } from "../../lib/store";
import { RoomType, ServiceCatalogItem } from "../../lib/types";
import { addDays, formatDate, formatVND, nightsBetween, toISODate } from "../../lib/format";
import { BookingFlow } from "./BookingFlow";
import { LuxHero } from "./LuxHero";
import { BookingBar } from "./BookingBar";
import { RoomPreview } from "./RoomPreview";
import { Reveal } from "./Reveal";
import { ScrollTools } from "./ScrollTools";
import { CountUp, CursorFx, Preloader } from "./Enhancements";

/** Ảnh dự phòng theo thứ tự hạng phòng — dùng khi hạng phòng chưa có ảnh riêng. */
const ROOM_FALLBACK = ["/media/room-deluxe.webp", "/media/room-suite.webp", "/media/room-superior.webp"];

const AMENITY_ICONS: Array<{ match: RegExp; Icon: typeof Wifi }> = [
  { match: /wifi|internet|mạng/i, Icon: Wifi },
  { match: /ăn sáng|breakfast|cà phê/i, Icon: Coffee },
  { match: /ban công|view|biển|balcony|hướng/i, Icon: Waves },
  { match: /điều hòa|máy lạnh|air/i, Icon: Wind },
  { match: /tv|truyền hình|netflix/i, Icon: Tv },
  { match: /bồn tắm|tắm|bath|spa/i, Icon: Bath },
  { match: /minibar|tủ lạnh|rượu/i, Icon: Wine },
  { match: /bàn làm việc|desk|công tác/i, Icon: Briefcase },
];

const amenityIcon = (label: string) =>
  AMENITY_ICONS.find((a) => a.match.test(label))?.Icon ?? Check;

const SIGNATURES = [
  { Icon: Waves, title: "Hồ bơi vô cực", desc: "Hồ nước mặn trên tầng thượng, quầy bar nổi phục vụ tới nửa đêm." },
  { Icon: Flower2, title: "Spa trị liệu", desc: "Liệu trình thảo mộc bản địa, phòng xông đá muối và yôga buổi sớm." },
  { Icon: UtensilsCrossed, title: "Ẩm thực ánh nến", desc: "Nhà hàng hải sản bên sóng, thực đơn đổi theo mẻ cá trong ngày." },
  { Icon: ConciergeBell, title: "Quản gia riêng", desc: "Một đầu mối lo mọi việc: đưa đón, đặt bàn, tour riêng, giặt là hoả tốc." },
];

/** Dải số liệu — tách phần số để đếm-lên (Mục 7), giữ nguyên hậu tố hiển thị. */
const BAND: Array<{ to: number; decimals: number; suffix: string; label: string }> = [
  { to: 4.9, decimals: 1, suffix: "", label: "Điểm hài lòng" },
  { to: 96, decimals: 0, suffix: "%", label: "Khách quay lại" },
  { to: 5, decimals: 0, suffix: "′", label: "Xác nhận phòng" },
  { to: 0, decimals: 0, suffix: "₫", label: "Phí huỷ trước 48h" },
];

const CATEGORY_META: Record<ServiceCatalogItem["category"], { label: string; Icon: typeof Shirt }> = {
  laundry: { label: "Giặt là", Icon: Shirt },
  food: { label: "Ẩm thực", Icon: UtensilsCrossed },
  transport: { label: "Đưa đón & di chuyển", Icon: Car },
  other: { label: "Tiện ích khác", Icon: ConciergeBell },
};

const TESTIMONIALS = [
  { name: "Minh Quân", role: "Lưu trú tháng 7/2026", text: "Đặt phòng mất đúng một phút, lễ tân gọi xác nhận sau 5 phút. Phòng đẹp hơn cả ảnh.", stars: 5 },
  { name: "Thu Hà", role: "Kỳ nghỉ gia đình", text: "Ban công nhìn thẳng ra vịnh, bữa sáng dọn tận phòng đúng giờ. Sẽ quay lại.", stars: 5 },
  { name: "Anh Khoa", role: "Công tác kết hợp nghỉ dưỡng", text: "Quản gia sắp xếp xe sân bay và tour đảo chỉ trong một tin nhắn.", stars: 4 },
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Trang chủ công khai theo ngôn ngữ thiết kế khách sạn 5★. */
export function Home({ onViewBookings, onOpenLegal }: { onViewBookings?: () => void; onOpenLegal?: () => void }) {
  const { roomTypes, rooms, services, getAvailableRooms, quoteFor } = useStore();
  const today = toISODate(new Date());
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 1));
  const [guests, setGuests] = useState(2);
  const [picking, setPicking] = useState<{ type: RoomType; roomId: string } | null>(null);

  const nights = Math.max(nightsBetween(checkIn, checkOut), 1);
  const available = useMemo(
    () => getAvailableRooms(checkIn, checkOut, guests || 1),
    [getAvailableRooms, checkIn, checkOut, guests],
  );
  const availByType = useMemo(() => {
    const m = new Map<string, string[]>();
    available.forEach((r) => m.set(r.typeId, [...(m.get(r.typeId) ?? []), r.id]));
    return m;
  }, [available]);

  const changeCheckIn = (v: string) => {
    setCheckIn(v);
    if (v >= checkOut) setCheckOut(addDays(v, 1));
  };

  const serviceGroups = (Object.keys(CATEGORY_META) as ServiceCatalogItem["category"][])
    .map((cat) => ({ cat, meta: CATEGORY_META[cat], items: services.filter((s) => s.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <Preloader />
      <CursorFx />
      <div className="elev-grain" aria-hidden="true" />
      <ScrollTools />

      <LuxHero
        roomCount={rooms.length}
        reviewCount={1284}
        onCheckAvailability={() => scrollTo("booking")}
        onExploreRooms={() => scrollTo("rooms")}
      />

      {/* ===== Thanh đặt phòng ===== */}
      <div id="booking" style={{ scrollMarginTop: 80 }}>
        <BookingBar
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          minDate={today}
          onCheckIn={changeCheckIn}
          onCheckOut={setCheckOut}
          onGuests={setGuests}
          onSearch={() => scrollTo("rooms")}
        />
      </div>

      {/* ===== Phòng & Suite ===== */}
      <section id="rooms" className="lux-section" style={{ scrollMarginTop: 90 }}>
        <div className="lux-shell lux-shell--wide">
          <div className="lux-section__bar">
            <Reveal className="lux-section__head">
              <p className="lux-eyebrow">Lưu trú</p>
              <h2 className="lux-title">Phòng &amp; Suite</h2>
              <p className="lux-lede">
                {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} đêm · còn {available.length} phòng trống cho{" "}
                {guests} khách. Giá hiển thị là giá đặt trực tiếp, tốt nhất trong mọi kênh.
              </p>
            </Reveal>
            <button type="button" className="lux-linkline" onClick={() => scrollTo("services")}>
              Xem dịch vụ đi kèm
            </button>
          </div>

          <div className="lux-rooms">
            {roomTypes.map((t, i) => {
              const count = availByType.get(t.id)?.length ?? 0;
              const soldOut = count === 0;
              const quote = quoteFor(t.id, checkIn, checkOut);
              const total = quote?.total ?? t.basePrice * nights;
              const img = t.image && t.image.trim() ? t.image : ROOM_FALLBACK[i % ROOM_FALLBACK.length];
              return (
                <Reveal key={t.id} className="lux-room" delay={(i % 3) as 0 | 1 | 2}>
                  <div className="lux-room__media">
                    <RoomPreview type={t} image={img} />
                    <span className={soldOut ? "lux-flag lux-flag--out" : "lux-flag"}>
                      <i />
                      {soldOut ? "Hết phòng" : `Còn ${count} phòng`}
                    </span>
                  </div>

                  <div className="lux-room__body">
                    <div className="lux-room__head">
                      <div>
                        <h3 className="lux-room__name">{t.name}</h3>
                        <span className="lux-room__cap">
                          <Users2 className="size-3.5" /> Tối đa {t.capacity} khách
                        </span>
                      </div>
                      <div className="lux-price">
                        <span className="lux-price__label">Theo kỳ lưu trú</span>
                        <span className="lux-price__value">
                          <CountUp to={quote?.avgPerNight ?? t.basePrice} format={formatVND} />
                        </span>{" "}
                        <span className="lux-price__unit">/ đêm</span>
                      </div>
                    </div>

                    {t.description && <p className="lux-room__desc">{t.description}</p>}

                    <div className="lux-chips">
                      {t.amenities.slice(0, 3).map((a) => {
                        const Icon = amenityIcon(a);
                        return (
                          <span key={a} className="lux-chip">
                            <Icon className="size-3.5" /> {a}
                          </span>
                        );
                      })}
                      {t.amenities.length > 3 && <span className="lux-chip">+{t.amenities.length - 3}</span>}
                    </div>

                    <div className="lux-room__foot">
                      <span className="lux-room__total">
                        {nights} đêm
                        <b>{formatVND(total)}</b>
                      </span>
                      <button
                        type="button"
                        className={soldOut ? "lux-btn lux-btn--outline lux-btn--sm" : "lux-btn lux-btn--ink lux-btn--sm"}
                        disabled={soldOut}
                        onClick={() => { const roomId = availByType.get(t.id)?.[0]; if (roomId) setPicking({ type: t, roomId }); }}
                      >
                        <BedDouble className="lux-btn__icon" />
                        {soldOut ? "Hết phòng" : "Đặt phòng"}
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Tiện nghi đặc trưng ===== */}
      <section className="lux-section lux-section--tight lux-section--sand">
        <div className="lux-shell lux-shell--wide">
          <div className="lux-amenities">
            {SIGNATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="lux-amenity" style={{ fontFamily: "var(--lux-font-sans)" }}>
                <span className="lux-amenity__icon"><Icon className="size-6" /></span>
                <h3 className="lux-amenity__title" style={{ fontFamily: "var(--lux-font-sans)" }}>{title}</h3>
                <p className="lux-amenity__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Trải nghiệm ẩm thực ===== */}
      <section id="experiences" className="lux-section" style={{ scrollMarginTop: 90 }}>
        <div className="lux-shell lux-shell--wide">
          <div className="lux-split">
            <Reveal className="lux-split__media lux-split__media--tall">
              <ImageWithFallback
                src="/media/dining.webp"
                alt="Nhà hàng ánh nến hướng biển"
                loading="lazy"
                className="size-full object-cover"
              />
            </Reveal>
            <Reveal className="lux-split__body" delay={1}>
              <p className="lux-eyebrow">Trải nghiệm</p>
              <h2 className="lux-title">Bữa tối bên sóng,<br />chỉ dành cho 12 bàn</h2>
              <p className="lux-lede">
                Thực đơn đổi theo mẻ cá trong ngày. Bàn cạnh cửa kính được giữ riêng cho khách lưu trú —
                đặt bàn ngay khi xác nhận phòng để chọn khung giờ hoàng hôn.
              </p>
              <ul className="lux-featlist">
                <li><Check className="size-4" /> Set 5 món theo mùa, kèm rượu vang chọn lọc</li>
                <li><Check className="size-4" /> Bàn riêng trên bãi cát cho dịp kỷ niệm</li>
                <li><Check className="size-4" /> Bếp phục vụ tận phòng 24/7</li>
              </ul>
              <div>
                <button type="button" className="lux-btn lux-btn--outline" onClick={() => scrollTo("services")}>
                  Xem dịch vụ &amp; đặt thêm
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== Dải số liệu ===== */}
      <section className="lux-section lux-section--tight lux-section--dark">
        <div className="lux-shell lux-shell--wide">
          <div className="lux-band">
            {BAND.map((b) => (
              <div key={b.label} className="lux-band__item">
                <span className="lux-band__value">
                  <CountUp to={b.to} decimals={b.decimals} suffix={b.suffix} />
                </span>
                <span className="lux-band__label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Dịch vụ đi kèm ===== */}
      <section id="services" className="lux-section lux-section--sand" style={{ scrollMarginTop: 90 }}>
        <div className="lux-shell lux-shell--wide">
          <Reveal className="lux-section__head" >
            <p className="lux-eyebrow">Dịch vụ</p>
            <h2 className="lux-title">Thêm một chút chu đáo</h2>
            <p className="lux-lede">
              Gọi thêm bất cứ lúc nào trong kỳ lưu trú — mọi chi phí được tổng hợp vào một hóa đơn khi trả phòng.
            </p>
          </Reveal>

          <div className="lux-amenities" style={{ marginTop: 40 }}>
            {serviceGroups.map(({ cat, meta, items }) => {
              const Icon = meta.Icon;
              return (
                <div key={cat} className="lux-amenity">
                  <span className="lux-amenity__icon"><Icon className="size-6" /></span>
                  <h3 className="lux-amenity__title">{meta.label}</h3>
                  <ul className="lux-footer__list" style={{ color: "var(--lux-stone)", fontSize: ".875rem" }}>
                    {items.slice(0, 4).map((s) => (
                      <li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>{s.name}</span>
                        <span style={{ whiteSpace: "nowrap" }}>{formatVND(s.price)}/{s.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Đánh giá ===== */}
      <section className="lux-section">
        <div className="lux-shell lux-shell--wide">
          <Reveal className="lux-section__head lux-section__head--center">
            <p className="lux-eyebrow lux-eyebrow--center">Cảm nhận</p>
            <h2 className="lux-title">Khách nói gì về {HOTEL_NAME}</h2>
          </Reveal>

          <div className="lux-quotes" style={{ marginTop: 48 }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} className="lux-quote" delay={(i % 3) as 0 | 1 | 2}>
                <div className="lux-stars" aria-label={`${t.stars} trên 5 sao`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-4" fill="currentColor" style={{ opacity: s < t.stars ? 1 : 0.28 }} />
                  ))}
                </div>
                <blockquote className="lux-quote__text">“{t.text}”</blockquote>
                <figcaption className="lux-quote__meta">
                  <span className="lux-avatar">{t.name.split(" ").map((w) => w[0]).slice(-2).join("")}</span>
                  <span>
                    <span className="lux-quote__name">{t.name}</span>
                    <br />
                    <span className="lux-quote__role">{t.role}</span>
                  </span>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Ưu đãi đặt trực tiếp ===== */}
      <section id="offers" className="lux-section lux-section--tight" style={{ scrollMarginTop: 90 }}>
        <div className="lux-shell lux-shell--wide">
          <div className="lux-cta">
            <ImageWithFallback src="/media/pool.webp" alt="" loading="lazy" className="size-full object-cover" />
            <div className="lux-cta__inner">
              <p className="lux-eyebrow lux-eyebrow--light lux-eyebrow--center">Ưu đãi đặt trực tiếp</p>
              <h2 className="lux-title" style={{ color: "#fff" }}>Giữ phòng hôm nay chỉ với một khoản cọc nhỏ</h2>
              <p className="lux-lede lux-lede--light" style={{ textAlign: "center" }}>
                Phần còn lại thanh toán khi nhận phòng. Huỷ miễn phí trước 48 giờ, lễ tân xác nhận trong ~5 phút.
              </p>
              <button type="button" className="lux-btn lux-btn--gold" data-magnetic onClick={() => scrollTo("rooms")}>
                Chọn phòng ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      {picking && (
        <BookingFlow
          type={picking.type}
          roomId={picking.roomId}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests || 1}
          nights={nights}
          onClose={() => setPicking(null)}
          onViewBookings={onViewBookings}
          onOpenLegal={onOpenLegal}
        />
      )}
    </div>
  );
}
