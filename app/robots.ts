import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/app-url";



export default function robots(): MetadataRoute.Robots {

  return {

    rules: {

      userAgent: "*",

      allow: ["/", "/about", "/help", "/pricing", "/privacy", "/terms"],

      disallow: ["/admin", "/api", "/dashboard", "/settings", "/reports"],

    },

    sitemap: absoluteUrl("/sitemap.xml"),

  };

}


