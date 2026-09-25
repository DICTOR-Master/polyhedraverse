import type { MetadataRoute } from "next";

// Every page, for search engines (served at /sitemap.xml).
const SITE = "https://polyhedraverse.vercel.app";
const LANGS = ["ja", "es", "fr", "ko", "zh", "ru"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now },
    { url: `${SITE}/guide`, lastModified: now },
    ...LANGS.map((l) => ({ url: `${SITE}/guide/${l}`, lastModified: now })),
    { url: `${SITE}/terms`, lastModified: now },
    { url: `${SITE}/privacy`, lastModified: now },
  ];
}
