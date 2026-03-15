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
  hlsUrl: string | null;
  streamStatus: string;
  status: string;
}

export interface StreamInfo {
  id: string;
  facilityName: string;
  courtName: string;
  youtubeUrl: string | null;
  hlsUrl: string | null;
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

/** Validate the commentator PIN. Returns true if valid. */
export async function validateCommentatorPin(streamId: string, pin: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}/commentator-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}

/**
 * Send a WebRTC SDP offer to the monitoring-server WHIP proxy.
 * The server validates the PIN, then forwards the SDP to stream-mixer → MediaMTX.
 * Returns the SDP answer string, or null on failure.
 */
export async function commentatorWhip(streamId: string, pin: string, sdp: string): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/streams/${streamId}/commentator-whip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, sdp }),
  });
  if (!res.ok) return null;
  return res.text();
}
