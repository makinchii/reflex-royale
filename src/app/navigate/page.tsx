import { NavigationScene } from "@/components/app/navigation-scene";
import { CircuitBackground } from "@/components/thegridcn/circuit-background";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Navigate"),
};

export default async function NavigatePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative h-svh max-h-svh overflow-hidden bg-background text-foreground">
      <CircuitBackground animated={false} opacity={0.1} className="pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-primary/40" />
      <section className="landing-shell relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4">
        <div className="landing-page-frame" aria-hidden="true" />
        <NavigationScene canPlayOnline={Boolean(user)} />
      </section>
    </main>
  );
}
