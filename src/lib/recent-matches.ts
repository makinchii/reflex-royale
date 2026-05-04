import mongoose from "mongoose";

export type RecentMatch = {
  averageReactionTime: number;
  mode: "local" | "online";
  place: number;
  playedAt: Date | string;
};

export type PlayerPerformanceStats = {
  bestWinStreak: number;
  currentWinStreak: number;
  falseStarts: number;
  gamesPlayed: number;
  reactions: number;
  timeSpentPlayingSeconds: number;
  totalReactionTime: number;
  wins: number;
};

type UserRecentMatchesDocument = {
  bestWinStreak?: number;
  currentWinStreak?: number;
  falseStarts?: number;
  gamesPlayed?: number;
  reactions?: number;
  recentMatches?: RecentMatch[];
  timeSpentPlayingSeconds?: number;
  totalReactionTime?: number;
  wins?: number;
};

const emptyStats: PlayerPerformanceStats = {
  bestWinStreak: 0,
  currentWinStreak: 0,
  falseStarts: 0,
  gamesPlayed: 0,
  reactions: 0,
  timeSpentPlayingSeconds: 0,
  totalReactionTime: 0,
  wins: 0,
};

export async function getRecentMatches(username: string, limit = 5): Promise<RecentMatch[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const users = mongoose.connection.db?.collection<UserRecentMatchesDocument>("users");
  if (!users) {
    return [];
  }

  const user = await users.findOne(
    { username },
    { projection: { _id: 0, recentMatches: { $slice: limit } } }
  );

  return (user?.recentMatches || []).filter((match) => match.mode === "online").slice(0, limit);
}

export async function getPlayerPerformanceStats(username: string): Promise<PlayerPerformanceStats> {
  if (mongoose.connection.readyState !== 1) {
    return emptyStats;
  }

  const users = mongoose.connection.db?.collection<UserRecentMatchesDocument>("users");
  if (!users) {
    return emptyStats;
  }

  const user = await users.findOne(
    { username },
    {
      projection: {
        _id: 0,
        bestWinStreak: 1,
        currentWinStreak: 1,
        falseStarts: 1,
        gamesPlayed: 1,
        reactions: 1,
        timeSpentPlayingSeconds: 1,
        totalReactionTime: 1,
        wins: 1,
      },
    }
  );

  return {
    bestWinStreak: Number(user?.bestWinStreak || 0),
    currentWinStreak: Number(user?.currentWinStreak || 0),
    falseStarts: Number(user?.falseStarts || 0),
    gamesPlayed: Number(user?.gamesPlayed || 0),
    reactions: Number(user?.reactions || 0),
    timeSpentPlayingSeconds: Number(user?.timeSpentPlayingSeconds || 0),
    totalReactionTime: Number(user?.totalReactionTime || 0),
    wins: Number(user?.wins || 0),
  };
}
