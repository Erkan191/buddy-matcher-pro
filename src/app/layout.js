import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.buddymatcher.co.uk"),
  title: {
    default: "Buddy Matcher | Random Group Generator",
    template: "%s | Buddy Matcher",
  },
  description:
    "Create fair, controlled random groups in seconds. Perfect for classrooms, teams, workshops, events, clubs and coaches. Make pairs, trios or larger groups, avoid repeats, keep people apart and spread group leaders.",
  keywords: [
    "random group generator",
    "random pair generator",
    "random team generator",
    "group maker",
    "team generator",
    "classroom group generator",
    "student group generator",
    "workshop group generator",
    "event group generator",
    "club group generator",
    "coach group generator",
    "icebreaker group generator",
    "breakout group generator",
    "training group generator",
    "make random groups",
    "create random teams",
    "fair group generator",
    "controlled group maker",
    "avoid repeat pairings",
    "don't group these two",
    "group leaders",
    "buddy matcher",
  ],
  openGraph: {
    title: "Buddy Matcher | Random Group Generator",
    description:
      "Create fair random groups for classrooms, teams, workshops, events and clubs. Make pairs, trios, larger groups, avoid repeats, keep people apart and spread leaders.",
    url: "https://www.buddymatcher.co.uk",
    siteName: "Buddy Matcher",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buddy Matcher | Random Group Generator",
    description:
      "Create fair random groups for classrooms, teams, workshops, events and clubs. Pairs, trios, larger groups, blocked pairs and group leaders.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}