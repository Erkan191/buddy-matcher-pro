import { teacherResourceLinks } from "@/lib/teacherResourceLinks";
import { siteUrl } from "@/lib/seo";

export default function sitemap() {
  return [
    { url: siteUrl, lastModified: "2026-09-15" },
    ...teacherResourceLinks.map((resource) => ({ url: `${siteUrl}${resource.href}` })),
    ...["/upgrade", "/contact", "/privacy", "/terms"].map((path) => ({ url: `${siteUrl}${path}` })),
  ];
}
