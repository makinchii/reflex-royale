import type { Metadata } from "next";
import { Geist_Mono, Orbitron, Rajdhani } from "next/font/google";
import Script from "next/script";
import "@/components/thegridcn-theme.css";
import "@/components/thegridcn-intensity.css";
import "./globals.css";
import { AppThemeBridge } from "@/components/app/app-theme-bridge";
import { AudioController } from "@/components/app/audio-controller";
import { PageReadyGate } from "@/components/page-ready-gate";
import { SITE_TITLE, faviconAresDarkDataUrl, faviconAresLightDataUrl, faviconDarkDataUrl, faviconLightDataUrl } from "@/lib/site-metadata";

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
  title: SITE_TITLE,
  description: "Server-authoritative reflex competition game",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const faviconSyncScript = `
    (function () {
      function readCookie(name) {
        return document.cookie.split(';').map(function (part) { return part.trim(); }).find(function (part) { return part.indexOf(name + '=') === 0; })?.slice(name.length + 1) || null;
      }
      function readTheme() {
        var theme = localStorage.getItem('ui-lab-theme') || readCookie('ui-lab-theme') || 'tron';
        return ['tron','ares','clu','athena','aphrodite','poseidon'].indexOf(theme) >= 0 ? theme : 'tron';
      }
      function pickIcon(theme) {
        var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (theme === 'ares') return dark ? '${faviconAresDarkDataUrl}' : '${faviconAresLightDataUrl}';
        return dark ? '${faviconDarkDataUrl}' : '${faviconLightDataUrl}';
      }
      function setIcon() {
        document.querySelectorAll('link[rel*="icon"]').forEach(function (node) {
          if (!node.hasAttribute('data-dynamic-favicon')) {
            node.remove();
          }
        });

        var link = document.querySelector('link[data-dynamic-favicon="true"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          link.type = 'image/svg+xml';
          link.dataset.dynamicFavicon = 'true';
          document.head.appendChild(link);
        }
        link.href = pickIcon(readTheme());
      }
      setIcon();
      window.addEventListener('focus', setIcon);
      window.addEventListener('storage', setIcon);
      document.addEventListener('visibilitychange', setIcon);
      window.__reflexRoyaleSetFavicon = setIcon;
    })();
  `;

  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} ${geistMono.variable}`}
      data-theme="tron"
      data-tron-intensity="light"
    >
      <head>
        <Script id="favicon-sync" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: faviconSyncScript }} />
      </head>
      <body data-theme="tron" data-tron-intensity="light">
        <PageReadyGate />
        <AppThemeBridge />
        <AudioController />
        {children}
      </body>
    </html>
  );
}
