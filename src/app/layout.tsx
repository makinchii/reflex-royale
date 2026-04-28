import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reflex Royale",
  description: "Server-authoritative reflex competition game"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/game.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
