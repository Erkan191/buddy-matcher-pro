import { pageMetadata } from "@/lib/seo";

export const metadata = {
  ...pageMetadata({ title: "Payment status", description: "Check your Buddy Matcher Pro payment and access status.", path: "/upgrade/success" }),
  robots: { index: false, follow: true },
};

export default function SuccessLayout({ children }) { return children; }
