import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ChronosCampus · Notice Decoder & Schedule Conflict Engine (PS-02)",
  description:
    "Deterministic notice parser, mathematical interval clash resolver, and RFC-5545 calendar synthesizer for Indian university circulars.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-800">
        {children}
      </body>
    </html>
  );
}
