import Link from "next/link";

import { WHATSAPP_URL } from "@/lib/whatsapp";

export function WhatsAppBanner({ message }: { message: string }) {
  return (
    <Link
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="animate-banner-in group block overflow-hidden bg-aura-primary py-2.5 text-aura-on-primary transition-colors hover:bg-aura-on-surface"
    >
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap group-hover:[animation-play-state:paused]">
        <MarqueeTrack message={message} />
        <MarqueeTrack message={message} aria-hidden />
      </div>
    </Link>
  );
}

function MarqueeTrack({
  message,
  "aria-hidden": ariaHidden,
}: {
  message: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-12"
      aria-hidden={ariaHidden || undefined}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="flex shrink-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-banner-ping rounded-full bg-[#25d366] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25d366]" />
          </span>
          <span className="text-xs font-medium tracking-wide sm:text-sm">
            {message}
          </span>
          <WhatsAppIcon className="h-4 w-4 shrink-0 opacity-90" />
        </span>
      ))}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.41-1.35a9.83 9.83 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.92C21.95 6.45 17.5 2 12.04 2Zm5.8 14.09c-.24.68-1.4 1.31-1.93 1.38-.53.08-1.03.29-3.31-.72-2.78-1.22-4.53-4.13-4.67-4.32-.13-.19-1.12-1.49-1.12-2.84s.71-2.02.97-2.29c.24-.26.53-.32.71-.32.18 0 .35 0 .5.01.17.01.39-.06.61.47.24.58.79 2 .86 2.15.07.15.11.32.02.5-.09.19-.14.31-.27.47-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.28.71 1.19 1.53 1.93 1.06.95 1.94 1.25 2.22 1.39.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.37-.24.62-.14.25.09 1.6.76 1.87.9.27.14.45.21.52.32.07.12.07.65-.17 1.33Z" />
    </svg>
  );
}
