import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * ScrollTools — hai tiện ích nhỏ cho trang dài:
 *  1) Thanh tiến độ đọc mảnh ở đỉnh (ánh kim), cập nhật bằng transform: scaleX
 *     nên chạy trên GPU, không gây repaint khi cuộn.
 *  2) Nút "về đầu trang" hiện khi đã cuộn quá một đoạn.
 *
 * Sự kiện scroll được gom vào requestAnimationFrame để không dồn nhiều lần
 * cập nhật trong một khung hình -> cuộn mượt. Tôn trọng prefers-reduced-motion
 * (cuộn tức thời thay vì trượt).
 */
export function ScrollTools() {
  const barRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => {
      frame.current = null;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      if (barRef.current) barRef.current.style.setProperty("--elev-p", String(p));
      setShowTop(doc.scrollTop > 600);
    };
    const onScroll = () => {
      if (frame.current === null) frame.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <div ref={barRef} className="elev-progress" aria-hidden="true" />
      <button
        type="button"
        className={showTop ? "elev-top is-on" : "elev-top"}
        aria-label="Về đầu trang"
        tabIndex={showTop ? 0 : -1}
        onClick={toTop}
      >
        <ArrowUp size={18} aria-hidden="true" />
      </button>
    </>
  );
}
