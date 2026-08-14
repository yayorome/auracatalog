import { WHATSAPP_URL } from "@/lib/whatsapp";

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/auraresearchp",
    Icon: InstagramIcon,
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@aura.research.par",
    Icon: TikTokIcon,
  },
  {
    name: "WhatsApp",
    href: WHATSAPP_URL,
    Icon: WhatsAppIcon,
  },
];

export function SocialLinks() {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      {SOCIAL_LINKS.map(({ name, href, Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-aura-primary text-aura-on-primary shadow-lg transition-transform hover:scale-105"
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.5 3c.4 1.9 1.6 3.2 3.5 3.4v2.6c-1.3 0-2.5-.4-3.5-1.1v6.3a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.03v2.7a2.7 2.7 0 1 0 1.9 2.6V3h2.9z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.41-1.35a9.83 9.83 0 0 0 4.63 1.18h.01c5.46 0 9.9-4.45 9.9-9.92C21.95 6.45 17.5 2 12.04 2Zm5.8 14.09c-.24.68-1.4 1.31-1.93 1.38-.53.08-1.03.29-3.31-.72-2.78-1.22-4.53-4.13-4.67-4.32-.13-.19-1.12-1.49-1.12-2.84s.71-2.02.97-2.29c.24-.26.53-.32.71-.32.18 0 .35 0 .5.01.17.01.39-.06.61.47.24.58.79 2 .86 2.15.07.15.11.32.02.5-.09.19-.14.31-.27.47-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.28.71 1.19 1.53 1.93 1.06.95 1.94 1.25 2.22 1.39.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.37-.24.62-.14.25.09 1.6.76 1.87.9.27.14.45.21.52.32.07.12.07.65-.17 1.33Z" />
    </svg>
  );
}
