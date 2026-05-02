import { cookies } from "next/headers";
import UiLabClient from "./ui-lab-client";
import { parseAtmosphere } from "./atmosphere";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = {
  title: pageTitle("UI Lab"),
};

export default async function UiLabPage() {
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get("ui-lab-theme")?.value;
  const storedIntensity = cookieStore.get("ui-lab-intensity")?.value;
  const storedAtmosphere = cookieStore.get("ui-lab-atmosphere")?.value;
  const initialTheme = storedTheme === "ares" ? "ares" : "tron";
  const initialIntensity = storedIntensity === "none" || storedIntensity === "medium" || storedIntensity === "heavy"
    ? storedIntensity
    : "light";
  const initialAtmosphere = parseAtmosphere(
    storedAtmosphere
      ? (() => {
          try {
            return decodeURIComponent(storedAtmosphere);
          } catch {
            return storedAtmosphere;
          }
        })()
      : storedAtmosphere
  );

  return <UiLabClient initialTheme={initialTheme} initialIntensity={initialIntensity} initialAtmosphere={initialAtmosphere} />;
}
