import { api } from "./client";
import type { GameScore, LeaderboardEntry } from "../types";

export async function submitScore(gameName: string, score: number) {
  const { data } = await api.post<GameScore>("/games/scores", {
    game_name: gameName,
    score,
  });
  return data;
}

export async function getLeaderboard(gameName: string, limit = 20) {
  const { data } = await api.get<LeaderboardEntry[]>(`/games/leaderboard/${gameName}`, {
    params: { limit },
  });
  return data;
}
