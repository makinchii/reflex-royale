export async function getAuthenticatedUsername() {
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin" });
    if (!response.ok) return null;
    const result = await response.json();
    return result.authenticated ? result.user?.username || null : null;
  } catch {
    return null;
  }
}

export async function recordRecentMatch({ averageReactionTime, falseStarts = 0, matchDurationSeconds = 0, mode, place, reactions = 0, totalReactionTime = 0 }) {
  if (!Number.isFinite(averageReactionTime) || averageReactionTime <= 0) return;
  if (!Number.isFinite(place) || place < 1) return;

  try {
    await fetch("/leaderboard/record-match", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        averageReactionTime: Math.round(averageReactionTime),
        falseStarts: Math.max(0, Math.round(falseStarts)),
        matchDurationSeconds: Math.max(0, Math.round(matchDurationSeconds)),
        mode,
        place: Math.round(place),
        reactions: Math.max(0, Math.round(reactions)),
        totalReactionTime: Math.max(0, Math.round(totalReactionTime)),
      }),
    });
  } catch {
    // Match history should never interrupt the game-over flow.
  }
}
