import { GamePageShell } from "@/components/app/game-page-shell";
import { LocalGameRuntime } from "@/components/app/local-game-runtime";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site-metadata";
import { normalizeThemeShades } from "@/lib/theme-preferences";

export const metadata = {
  title: pageTitle("Play"),
};

export default async function LocalPage() {
  const user = await getCurrentUser();
  const localPlayerThemeShades = user
    ? normalizeThemeShades({
        ...user.preferredThemeShades,
        [user.preferredThemeCommand || "tron"]: user.preferredThemeColor,
      })
    : null;

  return (
    <GamePageShell mode="local" user={user}>
      <LocalGameRuntime localPlayerThemeShades={localPlayerThemeShades} />
    </GamePageShell>
  );
}
