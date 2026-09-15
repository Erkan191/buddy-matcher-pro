import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({ title: "Log in", description: "Log in to your Buddy Matcher account.", path: "/login" }),
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }) { return children; }
