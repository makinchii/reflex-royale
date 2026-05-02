import { GamePageShell } from "@/components/app/game-page-shell";
import { LegacyGameShell } from "@/components/legacy-game-shell";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = {
  title: pageTitle("Play"),
};

export default async function LocalPage() {
  const user = await getCurrentUser();

  return (
    <GamePageShell mode="local" user={user}>
      <LegacyGameShell mode="local" showAccountMenu={false} />
    </GamePageShell>
  );
}
