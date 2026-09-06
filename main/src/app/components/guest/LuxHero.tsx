import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Moon, Pause, Play, Sun, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { ErrorBoundary } from "../ErrorBoundary";
import { RoomPreview } from "./RoomPreview";
import { LegacyLuxHero } from "./LegacyLuxHero";
import { useStore } from "../../lib/store";
import { formatVND } from "../../lib/format";
const Atmosphere = lazy(() => import("./HeroAtmosphere"));

type HeroProps = { roomCount: number; rating?: string; reviewCount?: number; onCheckAvailability: () => void; onExploreRooms: () => void };
export function LuxHero(props: HeroProps) {
  return import.meta.env.VITE_CINEMATIC_HERO === "false" ? <LegacyLuxHero {...props} /> : <CinematicHero {...props} />;
}
function CinematicHero({ roomCount, onCheckAvailability, onExploreRooms }: HeroProps) {
  const { roomTypes } = useStore();
  const [night, setNight] = useState(false);
  const [motion, setMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [discover, setDiscover] = useState(false);
  const [selected, setSelected] = useState("");
  const room = roomTypes.find(t => t.id === selected) ?? roomTypes.find(t => /^suite$/i.test(t.name)) ?? roomTypes[0];
  const disableAtmosphere = useCallback(() => { setUnavailable(true); setMotion(false); }, []);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => {
      setReduced(preference.matches);
      setMotion(!preference.matches && !connection?.saveData && matchMedia("(pointer: fine) and (min-width: 900px)").matches);
    };
    update(); preference.addEventListener("change", update);
    // Poster and readable content first. GPU only after the first paint/idle period.
    const timer = window.setTimeout(() => setReady(true), 1000);
    return () => { clearTimeout(timer); preference.removeEventListener("change", update); };
  }, []);
  return <>
    <section className={`lux-hero cinema-hero ${night ? "is-night" : "is-sunset"}`} aria-label="Không gian Sao Mai Hotel">
      <div className="cinema-scene" aria-hidden="true">
        <picture>
          <source media="(max-width: 700px)" srcSet="/media/hero-sunset-mobile.webp" />
          <img className="cinema-poster" src="/media/hero-sunset.webp" width="2200" height="1228" alt="" fetchPriority="high" decoding="async" />
        </picture>
        {night && <picture>
          <source media="(max-width: 700px)" srcSet="/media/hero-night-mobile.webp" />
          <img className="cinema-poster cinema-poster--night" src="/media/hero-night.webp" width="2200" height="1228" alt="" />
        </picture>}
        {ready && motion && !reduced && !unavailable && <ErrorBoundary scope="hero-atmosphere" fallback={<span className="cinema-poster-fallback" />}>
          <Suspense fallback={null}><Atmosphere night={night} onUnavailable={disableAtmosphere} /></Suspense>
        </ErrorBoundary>}
      </div>
      <div className="cinema-shade" aria-hidden="true" />
      <div className="cinema-topline lux-shell lux-shell--wide">
        <span className="cinema-chapter">THE SAO MAI EXPERIENCE <span> / 01</span></span>
        <div className="cinema-setting" role="group" aria-label="Ánh sáng khung cảnh">
          <button type="button" aria-pressed={!night} onClick={() => setNight(false)}><Sun size={15} />Hoàng hôn</button>
          <button type="button" aria-pressed={night} onClick={() => setNight(true)}><Moon size={15} />Về đêm</button>
        </div>
      </div>
      <div className="lux-shell lux-shell--wide cinema-content">
        <div className="cinema-copy">
          <p className="cinema-eyebrow"><span /> Một kỳ nghỉ. Chỉ dành cho bạn.</p>
          <h1>Một khoảng<br /><em>trời riêng.</em></h1>
          <p className="cinema-lede">Giữa biển, ánh sáng và sự tĩnh tại.<br />Để mỗi khoảnh khắc ở lại cùng bạn.</p>
          <div className="cinema-actions">
            <button type="button" className="lux-btn lux-btn--gold" onClick={onCheckAvailability}>Đặt kỳ nghỉ <ArrowUpRight size={17} /></button>
            <button type="button" className="cinema-explore" onClick={() => room ? setDiscover(true) : onExploreRooms()}><span><ArrowUpRight size={18} /></span>Khám phá không gian</button>
          </div>
          <div className="cinema-details"><span><b>{roomCount}</b> phòng &amp; suite</span><i /><span>Đặt trực tiếp tại Sao Mai</span></div>
        </div>
        {room && <div className="cinema-discovery">
          <button type="button" className="cinema-hotspot" aria-label={`Khám phá phòng ${room.name}`} onClick={() => setDiscover(true)}><span className="cinema-hotspot__mark"><span /></span><span>Khám phá {room.name}<ArrowUpRight size={14} /></span></button>
          <button type="button" className="cinema-room-teaser" onClick={() => setDiscover(true)} aria-label={`Mở ảnh và mô phỏng phòng ${room.name}`}>
            <img src={room.image || "/media/room-suite.webp"} alt="" loading="lazy" width="80" height="88" />
            <span><small>KHÔNG GIAN LƯU TRÚ</small><strong>{room.name}</strong><span>Ảnh phòng &amp; mô phỏng 3D</span></span><ArrowUpRight size={20} />
          </button>
        </div>}
      </div>
      <div className="cinema-bottom lux-shell lux-shell--wide">
        <button type="button" className="cinema-scroll" onClick={onExploreRooms}><ArrowDown size={15} />Tiếp nối hành trình</button>
        <span className="cinema-scene-label" role="status">{night ? "02 — Dưới ánh sao" : "01 — Chạm vào hoàng hôn"}</span>
        <button type="button" className="cinema-motion" disabled={reduced || unavailable} aria-pressed={motion} onClick={() => setMotion(v => !v)}>
          {motion ? <Pause size={14} /> : <Play size={14} />}{unavailable ? "Chế độ ảnh" : reduced ? "Giảm chuyển động" : motion ? "Dừng chuyển động" : "Bật chuyển động"}
        </button>
      </div>
    </section>
    <Dialog open={discover} onOpenChange={setDiscover}>
      {room && <DialogContent className="cinema-room-dialog">
        <DialogHeader>
          <p className="cinema-modal-kicker"><Sparkles size={14} /> KHÁM PHÁ SAO MAI</p>
          <DialogTitle>{room.name}</DialogTitle>
          <DialogDescription>Chọn hạng phòng, ngắm ảnh hoặc mở mô phỏng trước khi đặt kỳ nghỉ.</DialogDescription>
        </DialogHeader>
        <label className="cinema-room-select">Hạng phòng<select value={room.id} onChange={e => setSelected(e.target.value)}>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <div className="cinema-modal-media"><RoomPreview key={room.id} type={room} image={room.image || "/media/room-suite.webp"} /></div>
        <div className="cinema-modal-summary"><p>{room.description}</p><span>Tối đa {room.capacity} khách · Giá cơ sở {formatVND(room.basePrice)}/đêm</span></div>
        <div className="cinema-modal-actions"><button type="button" className="lux-btn lux-btn--ink" onClick={() => { setDiscover(false); onCheckAvailability(); }}>Chọn ngày &amp; đặt phòng <ArrowUpRight size={16} /></button><p>Giá chính xác theo ngày lưu trú ở bước chọn phòng.</p></div>
      </DialogContent>}
    </Dialog>
  </>;
}
