// ROOT layout — minimal shell only. Provides html/body + fonts + globals.
// The admin chrome (Rail, CsrfBootstrap, .app wrapper) lives in (admin)/layout.tsx
// so /preview/* and /sign-in /set-password render without it.
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Suite+ Admin",
  description: "Configure UST AI Suite+ for SAP without writing a single line of code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
