export const SITE_TITLE = "Reflex Royale";

export function pageTitle(page: string) {
  return `${page} | ${SITE_TITLE}`;
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const faviconBase = (background: string, accent: string) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="1" y="1" width="62" height="62" rx="14" stroke="${accent}" stroke-width="2" fill="${background}"/>
  <path d="M34 10L18 34h12l-2 20 18-28H34l4-16z" fill="${accent}"/>
</svg>`;

export const faviconLightDataUrl = svgToDataUrl(faviconBase("#f7fbfc", "#0fb8c6"));
export const faviconDarkDataUrl = svgToDataUrl(faviconBase("#081014", "#17d7e0"));
export const faviconAresLightDataUrl = svgToDataUrl(faviconBase("#fff7f4", "#ff4d2d"));
export const faviconAresDarkDataUrl = svgToDataUrl(faviconBase("#120503", "#ff6a45"));
