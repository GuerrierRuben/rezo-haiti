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
  title: {
    default: "Rezo Ayiti | Cartographie & Infrastructures Publiques",
    template: "%s | Rezo Ayiti",
  },
  description:
    "Plateforme open-source de signalement et de cartographie collaborative des infrastructures et services publics en Haïti (eau, électricité, routes, santé).",
  keywords: [
    "Haïti",
    "Ayiti",
    "signalement",
    "infrastructures",
    "cartographie",
    "eau",
    "électricité",
    "santé",
    "routes",
    "citoyen",
  ],
  authors: [{ name: "Rezo Ayiti Community" }],
  openGraph: {
    title: "Rezo Ayiti | Cartographie & Infrastructures Publiques",
    description:
      "Plateforme open-source de signalement et de cartographie collaborative des infrastructures et services publics en Haïti.",
    url: "https://rezo-ayiti.vercel.app",
    siteName: "Rezo Ayiti",
    locale: "fr_HT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rezo Ayiti | Cartographie & Infrastructures Publiques",
    description:
      "Plateforme open-source de signalement et de cartographie collaborative des infrastructures et services publics en Haïti.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
