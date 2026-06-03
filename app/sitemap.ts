import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/app-url";



export default function sitemap(): MetadataRoute.Sitemap {

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

    url: absoluteUrl(path || "/"),

    lastModified: new Date(),

    changeFrequency: path === "" ? "weekly" : "monthly",

    priority: path === "" ? 1 : 0.6,

  }));

}
