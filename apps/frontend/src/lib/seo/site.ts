// Single source of truth for site-wide metadata. Edit here, every page picks
// it up automatically through createMetadata() / sitemap / robots / JSON-LD.
import { env } from "next-runtime-env";

export const SITE = {
  name: "C-HR",
  shortName: "C-HR",
  domain: "c-hr.vn",
  url: env("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  tagline: "Phần mềm quản lý nhân sự cho doanh nghiệp Việt",
  description:
    "C-HR là nền tảng HRM toàn diện: hồ sơ nhân viên, phòng ban, chấm công, đơn từ và bảng lương — tất cả đồng bộ trên một nền tảng.",
  locale: "vi_VN",
  twitter: "",
  email: "hello@c-hr.vn",
  ogImage: "/opengraph-image",
} as const;

export const NAV_LINKS = [
  { href: "#features", label: "Tính năng" },
  { href: "#how", label: "Triển khai" },
  { href: "#compare", label: "So sánh" },
  { href: "#modules", label: "Module" },
] as const;

export type SiteConfig = typeof SITE;
