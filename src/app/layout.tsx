import type { Metadata } from "next";
import "./globals.css";
import { PageReadyGate } from "@/components/page-ready-gate";

export const metadata: Metadata = {
  title: "Reflex Royale",
  description: "Server-authoritative reflex competition game"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PageReadyGate />
        {children}
      </body>
    </html>
  );
}
