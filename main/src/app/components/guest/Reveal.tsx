import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bọc nội dung để nó nhẹ nhàng hiện ra khi cuộn tới (kiểu các site khách sạn 5★).
 * - Dùng IntersectionObserver, chỉ chạy 1 lần rồi ngắt.
 * - Nếu trình duyệt không hỗ trợ hoặc người dùng bật "giảm chuyển động",
 *   nội dung hiện ngay lập tức (CSS đã xử lý prefers-reduced-motion).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Độ trễ theo bậc để tạo hiệu ứng so le giữa các thẻ trong cùng hàng. */
  delay?: 0 | 1 | 2 | 3;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const cls = [
    "lux-reveal",
    delay ? `lux-reveal--d${delay}` : "",
    shown ? "is-in" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} id={id} className={cls}>
      {children}
    </div>
  );
}
