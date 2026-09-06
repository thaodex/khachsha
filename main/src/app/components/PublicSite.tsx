import { useEffect, useState } from "react";
import { Home } from "./guest/Home";
import { MyBookings } from "./guest/MyBookings";
import { GuestAuthDialog } from "./guest/GuestAuth";
import { LegalDoc, LegalPages } from "./guest/LegalPages";
import { BookingChat } from "./guest/BookingChat";
import { LuxHeader, type LuxNavItem } from "./guest/LuxHeader";
import { LuxFooter } from "./guest/LuxFooter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { HOTEL_NAME, useStore } from "../lib/store";

/**
 * Trang CÔNG KHAI dành cho khách — giao diện theo chuẩn website khách sạn 5★.
 * - Khách vãng lai: xem trang chủ & phòng thoải mái, chọn phòng rồi mới cần đăng nhập/đăng ký.
 * - Khách đã đăng nhập (role "guest"): đặt phòng, cọc giữ phòng, xem "Đặt phòng của tôi".
 * - Nhân viên dùng "Đăng nhập nội bộ" (trong hộp đăng nhập) để vào khu quản trị.
 */
export function PublicSite({ onStaffLogin }: { onStaffLogin: () => void }) {
  const { currentUser, logout } = useStore();
  const isGuest = currentUser?.role === "guest";
  const [view, setView] = useState<"home" | "my-bookings" | "legal">("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc>("privacy");

  const openLegal = (doc: LegalDoc) => {
    setLegalDoc(doc);
    setView("legal");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
  };

  // Đăng xuất thì quay về trang chủ
  useEffect(() => {
    if (!isGuest && view === "my-bookings") setView("home");
  }, [isGuest, view]);

  const scrollTo = (id: string) => {
    setView("home");
    // chờ render xong rồi cuộn tới section
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };

  const goHome = () => {
    setView("home");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const nav: LuxNavItem[] = [
    { id: "rooms", label: "Phòng & Suite", onSelect: () => scrollTo("rooms") },
    { id: "experiences", label: "Trải nghiệm", onSelect: () => scrollTo("experiences") },
    { id: "services", label: "Dịch vụ", onSelect: () => scrollTo("services") },
    { id: "offers", label: "Ưu đãi", onSelect: () => scrollTo("offers") },
    { id: "contact", label: "Liên hệ", onSelect: () => scrollTo("contact") },
  ];

  if (isGuest) {
    nav.push({
      id: "my-bookings",
      label: "Đặt phòng của tôi",
      active: view === "my-bookings",
      onSelect: () => {
        setView("my-bookings");
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 60);
      },
    });
  }

  return (
    <div className="lux min-h-screen">
      <a className="lux-skip" href="#main">Bỏ qua tới nội dung chính</a>

      <LuxHeader
        hotelName={HOTEL_NAME}
        nav={nav}
        overHero={view === "home"}
        isGuest={isGuest}
        userName={currentUser?.name}
        onHome={goHome}
        onBook={() => scrollTo("rooms")}
        onLogin={() => setAuthOpen(true)}
        onLogout={logout}
      
      />

      <main id="main">
        {view === "home" && (
          <Home onViewBookings={() => setView("my-bookings")} onOpenLegal={() => openLegal("terms")} />
        )}
        {view === "my-bookings" && (
          <div className="lux-shell lux-shell--wide" style={{ paddingTop: 120, paddingBottom: 72 }}>
            <MyBookings onBackHome={goHome} />
          </div>
        )}
        {view === "legal" && (
          <div className="lux-shell lux-shell--narrow" style={{ paddingTop: 120, paddingBottom: 72 }}>
            <LegalPages initial={legalDoc} onBack={goHome} />
          </div>
        )}
      </main>

      <LuxFooter
        hotelName={HOTEL_NAME}
        isGuest={isGuest}
        onNav={scrollTo}
        onOpenLegal={openLegal}
        onMyBookings={() => setView("my-bookings")}
        onLogin={() => setAuthOpen(true)}
      />

      {/* Chatbot đặt phòng 24/7 — chốt được phòng ngay trong hội thoại */}
      <BookingChat onOpenLegal={() => openLegal("terms")} />

      <GuestAuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onStaffLogin={() => {
          setAuthOpen(false);
          onStaffLogin();
        }}
      />
    </div>
  );
}
