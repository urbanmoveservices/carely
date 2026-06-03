import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

type BrandLogoSize = keyof typeof SIZE_CLASS;

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  /** Set when visible brand text is adjacent (decorative image). */
  decorative?: boolean;
};

export function BrandLogo({
  size = "md",
  className,
  decorative = false,
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND.logo}
      alt={decorative ? "" : BRAND.logoAlt}
      className={cn(
        "shrink-0 rounded-xl object-contain",
        SIZE_CLASS[size],
        className
      )}
      width={size === "lg" ? 40 : size === "md" ? 36 : 32}
      height={size === "lg" ? 40 : size === "md" ? 36 : 32}
    />
  );
}
