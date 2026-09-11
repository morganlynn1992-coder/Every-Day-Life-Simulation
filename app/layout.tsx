import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Everyday Life",
  description: "An accessible life-simulation game designed for keyboard and screen-reader play.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
