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
