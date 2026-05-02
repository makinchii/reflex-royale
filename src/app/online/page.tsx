import { GamePageShell } from "@/components/app/game-page-shell";
import { LegacyGameShell } from "@/components/legacy-game-shell";
import { requireCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Online Play"),
};

export default async function OnlinePage() {
  const user = await requireCurrentUser("/online");

  return (
    <GamePageShell mode="online" user={user}>
      <LegacyGameShell mode="remote" showAccountMenu={false} />
    </GamePageShell>
  );
}
