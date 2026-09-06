import { useEffect, useRef, useState } from "react";
import { CalendarDays, Minus, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { addDays, formatDate, parseLocalDate, toISODate } from "../../lib/format";

/**
 * Thanh đặt phòng — trái tim UX của mọi website khách sạn 5★:
 * - Nằm đè lên mép dưới hero (luôn thấy ngay khi vào trang)
 * - Tự động "dính" lên đỉnh khi cuộn qua, để khách đổi ngày bất cứ lúc nào
 * - Nút bấm/ô chọn đều ≥ 40–48px cho thao tác cảm ứng
 */
export function BookingBar({
  checkIn,
  checkOut,
  guests,
  minDate,
  onCheckIn,
  onCheckOut,
  onGuests,
  onSearch,
}: {
  checkIn: string;
  checkOut: string;
  guests: number;
  minDate: string;
  onCheckIn: (v: string) => void;
  onCheckOut: (v: string) => void;
  onGuests: (v: number) => void;
  onSearch: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [docked, setDocked] = useState(false);
  const [holdHeight, setHoldHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const evaluate = () => {
      if (window.innerWidth <= 900) {
        setDocked(false);
        setHoldHeight(undefined);
        return;
      }
      const top = el.getBoundingClientRect().top;
      setDocked((prev) => {
        const next = top <= 68;
        if (next && !prev) setHoldHeight(el.offsetHeight);
        if (!next && prev) setHoldHeight(undefined);
        return next;
      });
    };

    evaluate();
    window.addEventListener("scroll", evaluate, { passive: true });
    window.addEventListener("resize", evaluate);
    return () => {
      window.removeEventListener("scroll", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  return (
    <div className="lux-bookbar-wrap" ref={wrapRef} style={holdHeight ? { minHeight: holdHeight } : undefined}>
      <div className={docked ? undefined : "lux-shell lux-shell--wide"}>
        <form
          className={["lux-bookbar", docked ? "lux-bookbar--docked" : ""].filter(Boolean).join(" ")}
          style={{ fontFamily: "var(--lux-font-sans)" }}
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <div className="lux-bookbar__field">
            <DateField
              label="Nhận phòng"
              value={checkIn}
              min={minDate}
              onChange={onCheckIn}
            />
          </div>

          <div className="lux-bookbar__field">
            <DateField
              label="Trả phòng"
              value={checkOut}
              min={addDays(checkIn, 1)}
              onChange={onCheckOut}
            />
          </div>

          <div className="lux-bookbar__field">
            <span className="lux-field__label" id="lux-guests-label">Số khách</span>
            <div className="lux-stepper" role="group" aria-labelledby="lux-guests-label">
              <button
                type="button"
                aria-label="Giảm số khách"
                disabled={guests <= 1}
                onClick={() => onGuests(Math.max(1, guests - 1))}
              >
                <Minus className="size-4" />
              </button>
              <output aria-live="polite">{guests} khách</output>
              <button
                type="button"
                aria-label="Tăng số khách"
                disabled={guests >= 10}
                onClick={() => onGuests(Math.min(10, guests + 1))}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="lux-bookbar__cta">
            <button type="submit" className="lux-btn lux-btn--ink lux-btn--block">
              <Search className="lux-btn__icon" /> Tìm phòng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="lux-field__label">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="lux-field__control" aria-label={`${label}: ${formatDate(value)}`}>
          <CalendarDays className="size-4" />
          {formatDate(value)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseLocalDate(value)}
            onSelect={(d) => {
              if (d) {
                onChange(toISODate(d));
                setOpen(false);
              }
            }}
            disabled={min ? { before: parseLocalDate(min) } : undefined}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
