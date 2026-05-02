import mongoose from "mongoose";

export type LeaderboardEntry = {
  username: string;
  bestScore: number;
};

export async function getTopPlayers(limit: number): Promise<LeaderboardEntry[]> {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const users = mongoose.connection.db?.collection("users");
  if (!users) {
    return [];
  }

  return users
    .aggregate<LeaderboardEntry>([
      {
        $project: {
          username: 1,
          bestScore: { $ifNull: ["$bestScore", 0] },
          hasScore: {
            $cond: [{ $gt: [{ $ifNull: ["$bestScore", 0] }, 0] }, 0, 1],
          },
        },
      },
      {
        $sort: {
          hasScore: 1,
          bestScore: 1,
          username: 1,
        },
      },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          username: 1,
          bestScore: 1,
        },
      },
    ])
    .toArray();
}
