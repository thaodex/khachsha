import { ImageWithFallback } from "../figma/ImageWithFallback";

const HERO_IMG = "/media/hero-resort.webp";

/** Hero toàn màn hình: ảnh full-bleed + hiệu ứng Ken Burns chậm + thoại ngắn gọn. */
export function LegacyLuxHero({
  roomCount,
  rating = "4.9/5",
  reviewCount,
  onCheckAvailability,
  onExploreRooms,
}: {
  roomCount: number;
  rating?: string;
  reviewCount?: number;
  onCheckAvailability: () => void;
  onExploreRooms: () => void;
}) {
  return (
    <section className="lux-hero">
      <div className="lux-hero__media">
        <ImageWithFallback
          src={HERO_IMG}
          fetchPriority="high"
          decoding="async"
          width={1920}
          height={1280}
          alt="Hồ bơi vô cực hướng biển lúc hoàng hôn"
          className="size-full object-cover"
        />
      </div>
      <div className="lux-hero__scrim" />

      <div className="lux-shell lux-shell--wide lux-hero__content">
        <p className="lux-eyebrow lux-eyebrow--light">Khách sạn 5★ bên bờ biển · Việt Nam</p>

        <h1 className="lux-display lux-hero__title">
          Nơi thời gian
          <br />
          <em>chậm lại</em> vì bạn
        </h1>

        <p className="lux-hero__lede">
          Phòng và suite hướng biển, spa trị liệu, nhà hàng ánh nến bên sóng.
          Đặt trực tiếp để nhận giá tốt nhất — giữ phòng chỉ với một khoản cọc nhỏ.
        </p>

        <div className="lux-hero__actions">
          <button type="button" className="lux-btn lux-btn--gold" onClick={onCheckAvailability}>
            Kiểm tra phòng trống
          </button>
          <button type="button" className="lux-btn lux-btn--light" onClick={onExploreRooms}>
            Khám phá phòng &amp; suite
          </button>
        </div>

        <div className="lux-hero__meta">
          <div className="lux-hero__stat">
            <b>{rating}</b>
            <span>{reviewCount ? `${reviewCount.toLocaleString("vi-VN")} đánh giá` : "Đánh giá khách"}</span>
          </div>
          <div className="lux-hero__stat">
            <b>{roomCount}</b>
            <span>Phòng &amp; suite</span>
          </div>
          <div className="lux-hero__stat">
            <b>24/7</b>
            <span>Lễ tân &amp; quản gia</span>
          </div>
          <div className="lux-hero__stat">
            <b>5 phút</b>
            <span>Xác nhận đặt phòng</span>
          </div>
        </div>
      </div>

      <div className="lux-scrollcue" aria-hidden="true">
        <span>Cuộn xuống</span>
        <i />
      </div>
    </section>
  );
}
