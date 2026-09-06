import { useEffect, useState, type ReactNode } from "react";
import { LogIn, LogOut, Menu, X } from "lucide-react";

export type LuxNavItem = {
  id: string;
  label: string;
  onSelect: () => void;
  active?: boolean;
};

/**
 * Header kiểu resort 5★: trong suốt khi nằm trên ảnh hero, chuyển nền mờ đục
 * khi cuộn xuống, kèm menu tràn màn hình cho mobile.
 */
export function LuxHeader({
  hotelName,
  nav,
  overHero = false,
  isGuest = false,
  userName,
  onHome,
  onBook,
  onLogin,
  onLogout,
  languageSwitcher,
}: {
  hotelName: string;
  nav: LuxNavItem[];
  /** True khi header đang đặt chồng lên ảnh hero (trang chủ). */
  overHero?: boolean;
  isGuest?: boolean;
  userName?: string;
  onHome: () => void;
  onBook: () => void;
  onLogin: () => void;
  onLogout: () => void;
  languageSwitcher?: ReactNode;
}) {
  const [solid, setSolid] = useState(!overHero);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!overHero) {
      setSolid(true);
      return;
    }
    const onScroll = () => setSolid(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  // Khoá cuộn nền khi mở menu mobile
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Đóng menu bằng phím Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const initials = hotelName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const runNav = (item: LuxNavItem) => {
    setMenuOpen(false);
    item.onSelect();
  };

  const brand = (
    <button type="button" className="lux-brand" onClick={() => { setMenuOpen(false); onHome(); }}>
      <span className="lux-brand__mark">{initials}</span>
      <span>
        <span className="lux-brand__name">{hotelName}</span>
        <br />
        <span className="lux-brand__tag">Hotel &amp; Residences</span>
      </span>
    </button>
  );

  return (
    <>
      <header
        className={[
          "lux-header",
          solid ? "lux-header--solid lux-header--onLight" : "lux-header--onDark",
        ].join(" ")}
      >
        <div className="lux-shell lux-shell--wide lux-header__inner">
          {brand}

          <nav className="lux-nav" aria-label="Điều hướng chính">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className="lux-nav__link"
                aria-current={item.active ? "page" : undefined}
                onClick={() => runNav(item)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="lux-header__actions">


            {isGuest ? (
              <button type="button" className="lux-btn lux-btn--outline lux-btn--sm lux-btn--hideSm" onClick={onLogout}>
                <LogOut className="lux-btn__icon" />
                {userName ? userName.split(" ").slice(-1)[0] : "Thoát"}
              </button>
            ) : (
              <button type="button" className="lux-btn lux-btn--outline lux-btn--sm lux-btn--hideSm" onClick={onLogin}>
                <LogIn className="lux-btn__icon" />
                Đăng nhập
              </button>
            )}

            <button type="button" className="lux-btn lux-btn--gold lux-btn--sm" onClick={onBook}>
              Đặt phòng
            </button>

            <button
              type="button"
              className="lux-burger"
              aria-label="Mở menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="lux-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="lux-menu__top">
            {brand}
            <button type="button" className="lux-burger" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}>
              <X className="size-5" />
            </button>
          </div>

          <ul className="lux-menu__list">
            {nav.map((item) => (
              <li key={item.id}>
                <button type="button" className="lux-menu__link" onClick={() => runNav(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="lux-menu__foot">

            {isGuest ? (
              <button type="button" className="lux-btn lux-btn--light lux-btn--block" onClick={() => { setMenuOpen(false); onLogout(); }}>
                Đăng xuất
              </button>
            ) : (
              <button type="button" className="lux-btn lux-btn--light lux-btn--block" onClick={() => { setMenuOpen(false); onLogin(); }}>
                Đăng nhập
              </button>
            )}
            <button type="button" className="lux-btn lux-btn--gold lux-btn--block" onClick={() => { setMenuOpen(false); onBook(); }}>
              Đặt phòng ngay
            </button>
          </div>
        </div>
      )}
    </>
  );
}
