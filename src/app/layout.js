import "./globals.css";
import { siteUrl, siteName, socialImage } from "@/lib/seo";

const title = "Random Group Generator for Teachers & Teams | Buddy Matcher";
const description = "Create random pairs and trios for free. Pro adds larger groups, saved lists, fewer repeat pairings and a clear Student View for your classroom.";

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
  return <html lang="en-GB"><body>{children}</body></html>;
}
