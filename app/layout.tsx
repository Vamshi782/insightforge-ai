import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InsightForge AI — Instant Dashboards from Any Data",
  description:
    "Upload any CSV or Excel file. InsightForge auto-cleans your data, generates charts, and answers questions with AI — no sign-up required.",
  keywords: [
    "data analytics",
    "CSV viewer",
    "Excel dashboard",
    "AI insights",
    "business intelligence",
    "data visualisation",
  ],
  authors: [{ name: "Vamshi Krishna Korutla" }],
  openGraph: {
    title: "InsightForge AI — Instant Dashboards from Any Data",
    description:
      "Upload CSV or Excel → auto-clean → charts → AI analysis. No sign-up. Free forever.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "InsightForge AI",
    description: "Turn any CSV or Excel into an instant AI-powered dashboard.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
