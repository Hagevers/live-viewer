const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface MatchScore {
  sets: [number, number];
  games: [number, number];
  points: [string, string];
  servingTeam: number;
}

export interface ActiveMatch {
  matchId: string;
  streamId: string;
  team1Name: string;
  team2Name: string;
  score: MatchScore;
  facilityName: string;
  courtName: string;
  youtubeUrl: string | null;
  dailyRoomUrl: string | null;
  streamStatus: string;
  status: string;
}

export interface StreamInfo {
  id: string;
  facilityName: string;
  courtName: string;
  youtubeUrl: string | null;
  dailyRoomUrl: string | null;
  status: string;
}

export async function getStreamInfo(streamId: string): Promise<StreamInfo | null> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function getActiveMatch(streamId: string): Promise<ActiveMatch | null> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}/active-match`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function updateScore(
  matchId: string,
  pin: string,
  score: Partial<{
    score1Sets: number;
    score2Sets: number;
    score1Games: number;
    score2Games: number;
    score1Points: string;
    score2Points: string;
    servingTeam: number;
  }>
): Promise<MatchScore | null> {
  const res = await fetch(`${API_URL}/api/matches/${matchId}/score`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, ...score }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.score;
}

export async function getViewerToken(streamId: string): Promise<{ token: string; roomUrl: string; roomName: string } | null> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}/viewer-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function getCommentatorToken(streamId: string, pin: string): Promise<{ token: string; roomUrl: string; roomName: string } | null> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}/commentator-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}
