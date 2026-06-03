import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:7111";
  const paths = [
    "",
    "/about",
    "/help",
    "/pricing",
    "/privacy",
    "/terms",
    "/disclaimer",
    "/contact",
    "/login",
    "/signup",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
