import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.buddymatcher.co.uk"),
  title: {
    default: "Buddy Matcher | Smart Group Maker",
    template: "%s | Buddy Matcher",
  },
  description:
    "Make smarter, controlled groups in seconds. Keep certain people apart, avoid repeat pairings, spread group leaders and save lists for classrooms, teams, workshops, clubs and coaches.",
  keywords: [
    "smart group maker",
    "controlled group maker",
    "controlled group generator",
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
    "smart team generator",
    "avoid repeat pairings",
    "avoid repeat groups",
    "keep people apart",
    "don't group these two",
    "group leaders",
    "save class lists",
    "buddy matcher",
  ],
  openGraph: {
    title: "Buddy Matcher | Smart Group Maker",
    description:
      "Make smarter, controlled groups for classrooms, teams, workshops, events and clubs. Keep certain people apart, avoid repeat pairings, spread leaders and save lists.",
    url: "https://www.buddymatcher.co.uk",
    siteName: "Buddy Matcher",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buddy Matcher | Smart Group Maker",
    description:
      "Make smarter, controlled groups for classrooms, teams, workshops, clubs and coaches. Avoid repeat pairings, keep people apart and spread leaders.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
