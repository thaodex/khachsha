import { Languages } from "lucide-react";
import { Lang, useI18n } from "../lib/i18n";

const OPTIONS: Array<{ value: Lang; label: string; short: string }> = [
  { value: "vi", label: "Tiếng Việt", short: "VI" },
  { value: "en", label: "English", short: "EN" },
];

/**
 * Bộ chuyển ngôn ngữ Việt / Anh.
 * Lựa chọn được lưu lại nên khách nước ngoài quay lại không phải chọn lại.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();

  if (compact) {
    return (
      <div className="inline-flex items-center rounded-full border bg-white p-0.5 text-xs">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setLang(o.value)}
            aria-label={o.label}
            aria-pressed={lang === o.value}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              lang === o.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {o.short}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <Languages className="size-4 text-muted-foreground" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="rounded-lg border bg-white px-2 py-1.5 text-sm"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
