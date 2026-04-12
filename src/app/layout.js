import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.buddymatcher.co.uk"),
  title: {
    default: "Buddy Matcher",
    template: "%s | Buddy Matcher",
  },
  description:
    "Free random pair generator for names, classrooms, teams and events. Create random pairs or groups instantly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}