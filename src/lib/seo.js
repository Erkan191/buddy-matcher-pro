export const siteUrl = "https://www.buddymatcher.co.uk";
export const siteName = "Buddy Matcher";
export const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Buddy Matcher — random groups for classes and teams",
};

export function pageMetadata({ title, description, path, type = "website" }) {
  const fullTitle = `${title} | ${siteName}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: `${siteUrl}${path}`,
      siteName,
      locale: "en_GB",
      type,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [socialImage],
    },
  };
}
