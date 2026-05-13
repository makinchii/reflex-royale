import { GamePageShell } from "@/components/app/game-page-shell";
import { OnlineGameRuntime } from "@/components/app/online-game-runtime";
import { requireCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site-metadata";
import { normalizeThemeShades } from "@/lib/theme-preferences";

export const dynamic = "force-dynamic";

export const metadata = {
  title: pageTitle("Online Play"),
};

export default async function OnlinePage() {
  const user = await requireCurrentUser("/online");
  const localPlayerThemeShades = normalizeThemeShades({
    ...user.preferredThemeShades,
    [user.preferredThemeCommand || "tron"]: user.preferredThemeColor,
  });

  return (
    <GamePageShell mode="online" user={user}>
      <OnlineGameRuntime localPlayerThemeShades={localPlayerThemeShades} />
    </GamePageShell>
  );
}
