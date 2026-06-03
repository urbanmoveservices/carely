import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AuthBrandLinkProps = {
  className?: string;
  dark?: boolean;
};

export function AuthBrandLink({ className, dark = false }: AuthBrandLinkProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <BrandLogo size="md" decorative />
      <span
        className={cn(
          "text-xl font-bold",
          dark ? "text-white" : "text-gray-900"
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
