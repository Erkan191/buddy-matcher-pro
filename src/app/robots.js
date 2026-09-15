import { siteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
