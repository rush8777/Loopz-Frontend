import { Globe2 } from "lucide-react";
import { useId } from "react";

/** Small, brand-colored browser marks for the sessions list. */
export function BrowserIcon({ name, className = "" }: { name: string | null | undefined; className?: string }) {
  const browser = name?.toLowerCase() ?? "";
  const gradientId = useId().replaceAll(":", "");
  const common = { className: `size-[18px] shrink-0 ${className}`, viewBox: "0 0 24 24", role: "img" as const, "aria-label": name || "Unknown browser" };

  if (browser.includes("chrome")) return <svg {...common}>
    <circle cx="12" cy="12" r="11" fill="#e94235" />
    <path d="M2.8 6.5A11 11 0 0 1 21.6 7H12a5 5 0 0 0-4.4 2.6L2.8 6.5Z" fill="#fbbc04" />
    <path d="M21.6 7a11 11 0 0 1-9.5 16L17 14.7a5 5 0 0 0-.6-5.1L21.6 7Z" fill="#34a853" />
    <circle cx="12" cy="12" r="4.1" fill="#4285f4" stroke="white" strokeWidth="1.2" />
  </svg>;

  if (browser.includes("firefox")) return <svg {...common}>
    <defs><linearGradient id={`${gradientId}-firefox`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#ffb627" /><stop offset=".45" stopColor="#ff7139" /><stop offset="1" stopColor="#d62976" /></linearGradient></defs>
    <path d="M19.7 7.3c-.4-2-1.5-3.3-2.6-4.2.1 1.2-.2 2-.7 2.6-1-2-2.8-3.3-5-3.7.8.8 1.1 1.6 1.1 2.3C10 3.4 7.7 3 5.4 4c.8 0 1.5.4 2 .9-2.2 1.2-3.8 3.6-4 6.3-.3 5.4 3.5 9.6 8.8 9.6 4.6 0 8-3.4 8-7.9 0-2.1-.4-3.9-1.5-5.6Z" fill={`url(#${gradientId}-firefox)`} />
    <path d="M7 12.3c.7-1.7 2.2-2.7 4-2.7 2.9 0 4.7 1.9 4.7 4.3 0 2.2-1.7 3.7-4.1 3.7-2.8 0-4.6-2.1-4.6-5.3Z" fill="#5b2ca0" opacity=".8" />
  </svg>;

  if (browser.includes("edge")) return <svg {...common}>
    <defs><linearGradient id={`${gradientId}-edge`} x1="3" y1="18" x2="20" y2="5" gradientUnits="userSpaceOnUse"><stop stopColor="#0c7bdc" /><stop offset=".55" stopColor="#00a8a8" /><stop offset="1" stopColor="#35d07f" /></linearGradient></defs>
    <path d="M21 14.2c-.5 4.1-4.2 7-8.8 7-5.5 0-9.4-3.7-9.4-8.7 0-4.7 3.6-9 8.8-9 4.1 0 7.2 2.6 7.8 6.3-.9-1.3-2.7-2.1-4.6-2.1-3.7 0-6.1 2.2-6.7 5.2 1.3-1.1 3.1-1.6 5.1-1.4 2.7.2 4.9 1.2 7.8 2.7Z" fill={`url(#${gradientId}-edge)`} />
    <path d="M4 14.4c1.3 2.2 3.7 3.4 6.7 3.4 3.2 0 6-1.3 8.8-3.6-.3 4-3.6 7-8 7-4.3 0-7.4-2.6-7.5-6.8Z" fill="#0877c9" />
  </svg>;

  if (browser.includes("safari")) return <svg {...common}>
    <circle cx="12" cy="12" r="10" fill="#e8f5ff" stroke="#168bd2" strokeWidth="1.5" />
    <path d="m14.5 8-1.7 5-3.3 3 1.7-5 3.3-3Z" fill="#ef4444" />
    <path d="m14.5 8-1.7 5 3.3-3-1.6-2Z" fill="#168bd2" />
    <path d="M12 3v1.5M21 12h-1.5M12 21v-1.5M3 12h1.5" stroke="#168bd2" strokeWidth="1" strokeLinecap="round" />
  </svg>;

  if (browser.includes("opera")) return <svg {...common}>
    <ellipse cx="12" cy="12" rx="8.2" ry="10" fill="none" stroke="#e11d48" strokeWidth="4.2" />
  </svg>;

  if (browser.includes("brave")) return <svg {...common}>
    <path d="m6 3 3 1h6l3-1 2 4-1 3 1 5-4 6H8l-4-6 1-5-1-3 2-4Z" fill="#fb542b" />
    <path d="m8 8 4 2 4-2-1 5 2 3-5-1-5 1 2-3-1-5Z" fill="#fff" />
    <path d="m9 10 3 1 3-1M10 14l2 1 2-1" fill="none" stroke="#fb542b" strokeWidth="1" strokeLinecap="round" />
  </svg>;

  return <Globe2 className={`size-[18px] shrink-0 text-muted-foreground ${className}`} aria-label={name || "Unknown browser"} role="img" />;
}
