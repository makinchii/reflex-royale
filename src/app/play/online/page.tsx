import { LegacyGameShell } from "@/components/legacy-game-shell";
import { requireCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlayOnlinePage() {
  await requireCurrentUser("/play/online");

  return <LegacyGameShell mode="remote" />;
}
