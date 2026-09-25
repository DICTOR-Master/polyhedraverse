import type { MetadataRoute } from "next";

// Served at /robots.txt: everything may be crawled; points at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://polyhedraverse.vercel.app/sitemap.xml",
  };
}
