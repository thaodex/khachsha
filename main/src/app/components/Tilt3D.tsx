import { useEffect, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

/**
 * Tilt3D — hiệu ứng nghiêng 3D theo con trỏ chuột (thuần CSS transform,
 * không cần thư viện ngoài). Bọc quanh một card để tạo cảm giác chiều sâu
 * khi rê chuột. Tự bỏ qua trên thiết bị cảm ứng (không có hover).
 *
 * MƯỢT: mỗi lần chuột di chuyển chỉ ghi lại toạ độ; việc cập nhật transform
 * được gom vào một khung hình duy nhất bằng requestAnimationFrame nên không
 * còn bị dồn hàng loạt style-recalc gây khựng. will-change chỉ bật khi đang
 * tương tác để trình duyệt tự dọn layer sau khi rời chuột.
 */
export function Tilt3D({
  children,
  className = "",
  max = 7,
  scale = 1.015,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Góc nghiêng tối đa (độ) */
  max?: number;
  /** Phóng to nhẹ khi hover */
  scale?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const target = useRef<{ rx: number; ry: number } | null>(null);
  const enabled = useRef(true);

  // Chỉ bật trên thiết bị có con trỏ chính xác (chuột) — kiểm tra 1 lần.
  useEffect(() => {
    enabled.current =
      typeof window === "undefined" ||
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const apply = () => {
    frame.current = null;
    const el = ref.current;
    const t = target.current;
    if (!el || !t) return;
    el.style.transform = `perspective(900px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) scale(${scale})`;
  };

  const handleMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!enabled.current) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    target.current = { rx: (0.5 - py) * max, ry: (px - 0.5) * max };
    if (frame.current === null) frame.current = requestAnimationFrame(apply);
  };

  const handleEnter = () => {
    if (enabled.current && ref.current) ref.current.style.willChange = "transform";
  };

  const handleLeave = () => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    target.current = null;
    const el = ref.current;
    if (el) {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
      el.style.willChange = "auto";
    }
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt3d ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
