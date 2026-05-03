import type { Metadata } from "next";
import { SITE } from "./site";

interface CreateMetadataInput {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
}

/**
 * Build a Next.js Metadata object that's consistent across pages.
 * Pass `path` so OpenGraph + canonical use the right URL.
 */
export function createMetadata({
  title,
  description = SITE.description,
  path = "/",
  image = SITE.ogImage,
  noIndex = false,
  keywords,
}: CreateMetadataInput = {}): Metadata {
  const url = new URL(path, SITE.url).toString();
  const fullTitle = title
    ? `${title} | ${SITE.name}`
    : `${SITE.name} - ${SITE.tagline}`;

  return {
    title: fullTitle,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      title: fullTitle,
      description,
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: image, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
