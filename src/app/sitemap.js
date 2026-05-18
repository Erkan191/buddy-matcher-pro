import { teacherResourceLinks } from "@/lib/teacherResourceLinks";

const siteUrl = "https://www.buddymatcher.co.uk";

export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...teacherResourceLinks.map((resource) => ({
      url: `${siteUrl}${resource.href}`,
      lastModified,
      changeFrequency: "monthly",
      priority: resource.slug === "teachers" ? 0.9 : 0.8,
    })),
  ];
}
