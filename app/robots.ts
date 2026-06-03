import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:7111";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/help", "/pricing", "/privacy", "/terms"],
      disallow: ["/admin", "/api", "/dashboard", "/settings", "/reports"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
