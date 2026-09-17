import HomePage from "@/components/HomePage";
import { pageMetadata, siteUrl } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Random Group Generator for Teachers & Teams",
  description: "Create random pairs and trios for free. Pro adds larger groups, saved lists, fewer repeat pairings and a clear Student View for your classroom.",
  path: "/",
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "Buddy Matcher", inLanguage: "en-GB" },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Buddy Matcher",
      url: siteUrl,
      description: "A random group generator for teachers and teams. Create free pairs and trios, or use Pro for grouping rules, saved lists and Student View.",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any operating system with a modern web browser",
      browserRequirements: "Requires JavaScript",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "GBP", description: "Pairs and trios, with 5 normal generations plus 1 emergency generation per rolling 7 days." },
        { "@type": "Offer", name: "Buddy Matcher Pro", price: "3.99", priceCurrency: "GBP", url: `${siteUrl}/upgrade`, description: "One-off payment. No subscription." },
      ],
    },
  ],
};

export default function Page() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <HomePage />
  </>;
}
