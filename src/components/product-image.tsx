import Image from "next/image";

export function ProductImage({
  imageUrl,
  alt,
  sizes,
}: {
  imageUrl: string | null;
  alt: string;
  sizes: string;
}) {
  if (!imageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-aura-surface-container-high">
        <FlowerIcon className="h-8 w-8 text-aura-outline" />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
    />
  );
}

function FlowerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 9.5c0-2.5-1.5-4.5-3.5-4.5S5 7 5 9.5 6.5 12 9 12" />
      <path d="M12 9.5c0-2.5 1.5-4.5 3.5-4.5S19 7 19 9.5 17.5 12 15 12" />
      <path d="M12 14.5c0 2.5-1.5 4.5-3.5 4.5S5 17 5 14.5 6.5 12 9 12" />
      <path d="M12 14.5c0 2.5 1.5 4.5 3.5 4.5S19 17 19 14.5 17.5 12 15 12" />
    </svg>
  );
}
