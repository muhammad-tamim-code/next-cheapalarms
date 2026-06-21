import Image from "next/image";

import { BRAND, getBrandLogo } from "../../config/brand";

const SIZE_HEIGHT = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

/**
 * Tenant-aware logo — picks horizontal vs mark based on variant/context.
 * Horizontal assets ship on a dark background; use `framed` on light surfaces.
 */
export function BrandLogo({
  variant = "auto",
  context = "default",
  size = "sm",
  framed = false,
  className = "",
  priority = false,
  alt,
}) {
  const src = getBrandLogo(variant, context);
  const height = SIZE_HEIGHT[size] ?? SIZE_HEIGHT.sm;
  const label = alt ?? BRAND.name;

  const img = (
    <Image
      src={src}
      alt={label}
      width={height * 4}
      height={height}
      className={`h-auto w-auto max-h-full object-contain ${className}`}
      style={{ maxHeight: height }}
      priority={priority}
    />
  );

  if (framed) {
    return (
      <span className="inline-flex items-center rounded-lg bg-neutral-950 px-2 py-1">
        {img}
      </span>
    );
  }

  return img;
}
