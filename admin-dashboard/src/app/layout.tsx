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
  title: "KudiBase Admin | Secure Dashboard",
  description: "Administrative dashboard for KudiBase - Nigeria's favorite POS app for small businesses.",
  keywords: ["POS", "Inventory", "Sales", "Nigeria", "Business", "Admin"],
  authors: [{ name: "Al-Ameen Muhammad" }],
  openGraph: {
    title: "KudiBase Admin",
    description: "Manage your business efficiently with KudiBase.",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "KudiBase Admin",
    description: "Administrative dashboard for KudiBase.",
    images: ["/icon.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
