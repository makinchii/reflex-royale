import type { Metadata } from "next";
import { Geist_Mono, Orbitron, Rajdhani } from "next/font/google";
import Script from "next/script";
import "@/components/thegridcn-theme.css";
import "@/components/thegridcn-intensity.css";
import "./globals.css";
import { AppThemeBridge } from "@/components/app/app-theme-bridge";
import { AudioController } from "@/components/app/audio-controller";
import { PageReadyGate } from "@/components/page-ready-gate";
import { SITE_TITLE } from "@/lib/site-metadata";

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
        return ['tron','ares','clu','athena','aphrodite','poseidon','custom'].indexOf(theme) >= 0 ? theme : 'tron';
      }
      function isHexColor(value) {
        return /^#[0-9a-fA-F]{6}$/.test(value || '');
      }
      function readThemeCommand() {
        var command = localStorage.getItem('reflexRoyaleThemeCommand') || readCookie('reflexRoyaleThemeCommand') || 'tron';
        return ['ares','vulcan','apollo','aphrodite','bacchus','tron','gaia','olympus'].indexOf(command) >= 0 ? command : 'tron';
      }
      function readAccentColor(theme) {
        var customColor = localStorage.getItem('reflexRoyaleCustomThemeColor') || readCookie('reflexRoyaleCustomThemeColor');
        if (theme === 'custom' && isHexColor(customColor)) return customColor;
        var commandColors = {
          ares: '#ff003c',
          vulcan: '#ff7a00',
          apollo: '#ffd400',
          aphrodite: '#ff2ebd',
          bacchus: '#8a2bff',
          tron: '#00d4ff',
          gaia: '#24f07a',
          olympus: '#FFFFFF'
        };
        return commandColors[readThemeCommand()] || (theme === 'ares' ? commandColors.ares : commandColors.tron);
      }
      function pickIcon(theme) {
        var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var accent = readAccentColor(theme);
        var background = dark ? '#081014' : '#f7fbfc';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="1" y="1" width="62" height="62" rx="14" stroke="' + accent + '" stroke-width="2" fill="' + background + '"/><path d="M34 10L18 34h12l-2 20 18-28H34l4-16z" fill="' + accent + '"/></svg>';
        return 'data:image/svg+xml,' + encodeURIComponent(svg);
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
