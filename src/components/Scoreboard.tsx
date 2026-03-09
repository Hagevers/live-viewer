"use client";

import { MatchScore } from "@/lib/api";

interface ScoreboardProps {
  team1Name: string;
  team2Name: string;
  score: MatchScore;
  courtName?: string;
}

export default function Scoreboard({ team1Name, team2Name, score, courtName }: ScoreboardProps) {
  const pointLabels = ["0", "15", "30", "40", "AD"];

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-center z-20">
      <div className="pointer-events-auto bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl border border-white/10 min-w-[320px] max-w-[480px] w-full">
        {/* Court label */}
        {courtName && (
          <div className="bg-white/5 px-3 py-1 text-center">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
              {courtName}
            </span>
          </div>
        )}

        {/* Score table */}
        <div className="px-3 py-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider">
                <th className="text-left font-medium w-[40%] pb-1"></th>
                <th className="font-medium w-[15%] pb-1 text-center">Sets</th>
                <th className="font-medium w-[15%] pb-1 text-center">Games</th>
                <th className="font-medium w-[15%] pb-1 text-center">Points</th>
                <th className="w-[15%] pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {/* Team 1 */}
              <tr className="border-b border-white/5">
                <td className="py-1.5 text-left">
                  <div className="flex items-center gap-2">
                    {score.servingTeam === 1 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block flex-shrink-0" />
                    )}
                    <span className={`font-semibold text-sm truncate ${score.servingTeam !== 1 ? "ml-3.5" : ""}`}>
                      {team1Name}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 text-center font-bold text-lg text-white">
                  {score.sets[0]}
                </td>
                <td className="py-1.5 text-center font-semibold text-base text-white/90">
                  {score.games[0]}
                </td>
                <td className="py-1.5 text-center">
                  <span className="bg-white/10 rounded px-2 py-0.5 font-mono font-bold text-sm">
                    {score.points[0]}
                  </span>
                </td>
                <td></td>
              </tr>

              {/* Team 2 */}
              <tr>
                <td className="py-1.5 text-left">
                  <div className="flex items-center gap-2">
                    {score.servingTeam === 2 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block flex-shrink-0" />
                    )}
                    <span className={`font-semibold text-sm truncate ${score.servingTeam !== 2 ? "ml-3.5" : ""}`}>
                      {team2Name}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 text-center font-bold text-lg text-white">
                  {score.sets[1]}
                </td>
                <td className="py-1.5 text-center font-semibold text-base text-white/90">
                  {score.games[1]}
                </td>
                <td className="py-1.5 text-center">
                  <span className="bg-white/10 rounded px-2 py-0.5 font-mono font-bold text-sm">
                    {score.points[1]}
                  </span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
