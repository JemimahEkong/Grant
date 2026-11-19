import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import "./landing.css";
import "./app.css";

export const metadata: Metadata = {
  title: {
    default: "Grant — music clearance before export",
    template: "%s · Grant",
  },
  description:
    "Grant shows exactly what a track license covers, refuses when it does not cover your cut, and pays only after you approve the terms.",
};

export const viewport: Viewport = {
  themeColor: "#F4F6F0",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
