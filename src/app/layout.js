import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.buddymatcher.co.uk"),
  title: {
    default: "Buddy Matcher",
    template: "%s | Buddy Matcher",
  },
  description:
    "Smart classroom group maker for names, teams and classrooms. Create random pairs or groups, pick one randomly, keep certain people apart, and spread group leaders across teams.",
  keywords: [
    "random pair generator",
    "group maker",
    "classroom group generator",
    "student group generator",
    "random team generator",
    "buddy matcher",
    "pick one randomly",
    "group leader tool",
    "don't group these two",
    "teacher grouping tool",
  ],
  openGraph: {
    title: "Buddy Matcher",
    description:
      "Smart classroom group maker for names, teams and classrooms. Random groups, random picker, blocked pairs and group leaders.",
    url: "https://www.buddymatcher.co.uk",
    siteName: "Buddy Matcher",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buddy Matcher",
    description:
      "Smart classroom group maker with random groups, random picker, blocked pairs and group leaders.",
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}