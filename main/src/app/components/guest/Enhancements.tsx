import { useEffect, useRef, useState } from "react";

/* =============================================================================
   ENHANCEMENTS — các hiệu ứng JS tự-đóng-gói cho prompt "SAO MAI v2".
   - CountUp  : số đếm-lên một lần khi vào viewport (Mục 7, ngoại lệ số liệu).
   - CursorFx : con trỏ tuỳ biến (chấm gold + vòng bám mượt) + hiệu ứng nam châm
                cho phần tử [data-magnetic] (Mục 5 & 6.1). Chỉ desktop, tắt khi
                pointer:coarse hoặc prefers-reduced-motion.
   - Preloader: màn khởi động vẽ nét chữ lồng "SM" (Mục 3.5), chạy một lần/phiên.
   Tất cả animation chỉ đụng transform/opacity. Không import lib ngoài.
   ========================================================================== */

const prefersReduce = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ CountUp */
export function CountUp({
  to,
  duration = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  const [val, setVal] = useState(() => (prefersReduce() || to === 0 ? to : 0));

  useEffect(() => {
    if (done.current || prefersReduce() || to === 0) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit || done.current) return;
        done.current = true;
        io.disconnect();
        const start = performance.now();
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(to * ease(p));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(to);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  const text = format ? format(val) : `${prefix}${val.toFixed(decimals)}${suffix}`;
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

/* ----------------------------------------------------------------- CursorFx */
export function CursorFx() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches ||
      prefersReduce()
    )
      return;

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "elev-cursor-dot";
    ring.className = "elev-cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    document.body.append(dot, ring);
    document.body.classList.add("elev-has-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onOver = (e: Event) => {
      const t = (e.target as HTMLElement)?.closest?.(
        "a, button, [data-magnetic], input, textarea, select, [role='button']",
      );
      ring.classList.toggle("is-active", !!t);
    };
    const hide = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const show = () => {
      dot.style.opacity = "";
      ring.style.opacity = "";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerdown", () => ring.classList.add("is-press"));
    document.addEventListener("pointerup", () => ring.classList.remove("is-press"));
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);

    // Nam châm cho [data-magnetic] — kéo nhẹ về con trỏ (hệ số 0.3).
    const magnets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-magnetic]"),
    );
    const magnetCleanups = magnets.map((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`;
      };
      const reset = () => {
        el.style.transform = "";
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", reset);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", reset);
      };
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
      magnetCleanups.forEach((fn) => fn());
      dot.remove();
      ring.remove();
      document.body.classList.remove("elev-has-cursor");
    };
  }, []);

  return null;
}

/* ---------------------------------------------------------------- Preloader */
export function Preloader() {
  const [done, setDone] = useState(
    () =>
      typeof window === "undefined" ||
      sessionStorage.getItem("sm-preloaded") === "1",
  );
  const [gone, setGone] = useState(done);

  useEffect(() => {
    if (done) return;
    const reduce = prefersReduce();
    const t = setTimeout(
      () => {
        setDone(true);
        try {
          sessionStorage.setItem("sm-preloaded", "1");
        } catch {
          /* bỏ qua nếu storage bị chặn */
        }
      },
      reduce ? 200 : 2100,
    );
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => {
    if (!done || gone) return;
    const t = setTimeout(() => setGone(true), 800);
    return () => clearTimeout(t);
  }, [done, gone]);

  if (gone) return null;
  return (
    <div className={done ? "elev-preloader is-done" : "elev-preloader"} aria-hidden="true">
      <svg viewBox="0 0 200 110" role="presentation">
        <text x="100" y="74" textAnchor="middle" className="elev-mono">
          SM
        </text>
      </svg>
    </div>
  );
}
