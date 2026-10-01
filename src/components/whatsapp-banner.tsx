export function WhatsAppBanner({ message }: { message: string }) {
  return (
    <div className="animate-banner-in group block overflow-hidden bg-aura-primary py-2.5 text-aura-on-primary">
      <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap group-hover:[animation-play-state:paused]">
        <MarqueeTrack message={message} />
        <MarqueeTrack message={message} aria-hidden />
      </div>
    </div>
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
        </span>
      ))}
    </div>
  );
}
