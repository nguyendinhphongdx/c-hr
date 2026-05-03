import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: new URL(path, SITE.url).toString(),
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
