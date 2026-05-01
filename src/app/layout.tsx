import type { Metadata } from "next";
import { Geist_Mono, Orbitron, Rajdhani } from "next/font/google";
import "@/components/thegridcn-theme.css";
import "@/components/thegridcn-intensity.css";
import "./globals.css";
import { AppThemeBridge } from "@/components/app/app-theme-bridge";
import { PageReadyGate } from "@/components/page-ready-gate";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Reflex Royale",
  description: "Server-authoritative reflex competition game"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${geistMono.variable}`}
      data-theme="tron"
      data-tron-intensity="light"
    >
      <body data-theme="tron" data-tron-intensity="light">
        <PageReadyGate />
        <AppThemeBridge />
        {children}
      </body>
    </html>
  );
}
