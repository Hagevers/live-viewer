"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { updateScore } from "@/lib/api";
import { ScoreState, initialScore, awardPoint, toApiParams } from "@/lib/padel-scoring";

export default function ScorePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const pin = searchParams.get("pin") || "";

  const [score, setScore] = useState<ScoreState>(initialScore());
  const [team1Name, setTeam1Name] = useState("Team 1");
  const [team2Name, setTeam2Name] = useState("Team 2");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Load current match state on mount
  useEffect(() => {
    async function loadMatch() {
      try {
        // Use a simple ping to verify the PIN works
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/matches/${matchId}/score`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin }),
          }
        );

        if (res.status === 403) {
          setError("Invalid PIN");
          return;
        }

        if (res.status === 404) {
          setError("Match not found or has ended");
          return;
        }

        setConnected(true);
      } catch {
        setError("Cannot connect to server");
      }
    }

    if (pin) {
      loadMatch();
    } else {
      setError("No PIN provided");
    }
  }, [matchId, pin]);

  const handlePoint = useCallback(
    async (team: 1 | 2) => {
      if (sending) return;

      const newScore = awardPoint(score, team);
      setScore(newScore);
      setSending(true);

      try {
        await updateScore(matchId, pin, toApiParams(newScore));
      } catch {
        // Score still updated locally, will resync on next success
      }

      setSending(false);
    },
    [score, matchId, pin, sending]
  );

  const handleUndo = useCallback(async () => {
    // Reset to initial — simple undo for now
    const resetScore = initialScore();
    setScore(resetScore);
    setSending(true);
    await updateScore(matchId, pin, toApiParams(resetScore));
    setSending(false);
  }, [matchId, pin]);

  const handleToggleServe = useCallback(async () => {
    const newScore = {
      ...score,
      servingTeam: (score.servingTeam === 1 ? 2 : 1) as 1 | 2,
    };
    setScore(newScore);
    await updateScore(matchId, pin, { servingTeam: newScore.servingTeam });
  }, [score, matchId, pin]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
        <div className="text-center">
          <p className="text-red-400 text-xl font-semibold mb-2">{error}</p>
          <p className="text-white/40 text-sm">Check the link and try again</p>
        </div>
      </main>
    );
  }

  if (!connected) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-white/50 text-lg">Connecting...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 p-4 flex flex-col select-none">
      {/* Score display */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <table className="w-full text-center">
          <thead>
            <tr className="text-white/40 text-xs uppercase">
              <th className="text-left pb-2 w-[40%]">Team</th>
              <th className="pb-2 w-[15%]">Sets</th>
              <th className="pb-2 w-[15%]">Games</th>
              <th className="pb-2 w-[15%]">Pts</th>
              <th className="pb-2 w-[15%]">Serve</th>
            </tr>
          </thead>
          <tbody className="text-white text-lg font-bold">
            <tr className="border-b border-white/10">
              <td className="text-left py-2 text-sm font-semibold truncate">{team1Name}</td>
              <td className="py-2">{score.sets[0]}</td>
              <td className="py-2">{score.games[0]}</td>
              <td className="py-2">{score.points[0]}</td>
              <td className="py-2">
                {score.servingTeam === 1 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                )}
              </td>
            </tr>
            <tr>
              <td className="text-left py-2 text-sm font-semibold truncate">{team2Name}</td>
              <td className="py-2">{score.sets[1]}</td>
              <td className="py-2">{score.games[1]}</td>
              <td className="py-2">{score.points[1]}</td>
              <td className="py-2">
                {score.servingTeam === 2 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Big point buttons */}
      <div className="flex gap-4 mb-4 flex-1">
        <button
          onClick={() => handlePoint(1)}
          disabled={sending}
          className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 rounded-2xl text-white font-bold text-xl flex flex-col items-center justify-center min-h-[160px] transition-colors"
        >
          <span className="text-sm font-normal text-white/60 mb-1">Point</span>
          <span className="text-lg truncate px-2 max-w-full">{team1Name}</span>
        </button>

        <button
          onClick={() => handlePoint(2)}
          disabled={sending}
          className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 rounded-2xl text-white font-bold text-xl flex flex-col items-center justify-center min-h-[160px] transition-colors"
        >
          <span className="text-sm font-normal text-white/60 mb-1">Point</span>
          <span className="text-lg truncate px-2 max-w-full">{team2Name}</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleToggleServe}
          className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 rounded-xl py-4 text-white font-medium transition-colors"
        >
          Switch Serve
        </button>
        <button
          onClick={handleUndo}
          className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 rounded-xl py-4 text-white font-medium transition-colors"
        >
          Reset Score
        </button>
      </div>
    </main>
  );
}
