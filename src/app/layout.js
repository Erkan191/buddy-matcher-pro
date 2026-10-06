import "./globals.css";
import PageViewTracker from "@/components/PageViewTracker";
import { siteUrl, siteName, socialImage } from "@/lib/seo";

const title = "Random Group Generator for Teachers & Teams | Buddy Matcher";
const description = "Create random pairs and trios for free. Pro helps you keep students apart, avoid repeat pairings and save class lists, with Student View and flexible group sizes.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s | ${siteName}` },
  description,
  openGraph: {
    title, description, siteName, locale: "en_GB", type: "website",
    images: [socialImage],
  },
  twitter: { card: "summary_large_image", title, description, images: [socialImage] },
};

export default function RootLayout({ children }) {
  return <html lang="en-GB"><body><PageViewTracker />{children}</body></html>;
}
