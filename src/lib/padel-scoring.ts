import { MatchScore } from "./api";

const POINT_SEQUENCE = ["0", "15", "30", "40"];

export interface ScoreState {
  sets: [number, number];
  games: [number, number];
  points: [string, string];
  servingTeam: 1 | 2;
}

export function initialScore(): ScoreState {
  return {
    sets: [0, 0],
    games: [0, 0],
    points: ["0", "0"],
    servingTeam: 1,
  };
}

export function fromMatchScore(score: MatchScore): ScoreState {
  return {
    sets: [...score.sets] as [number, number],
    games: [...score.games] as [number, number],
    points: [...score.points] as [string, string],
    servingTeam: score.servingTeam as 1 | 2,
  };
}

/** Award a point to team (1 or 2). Returns new score state. */
export function awardPoint(state: ScoreState, team: 1 | 2): ScoreState {
  const s = {
    sets: [...state.sets] as [number, number],
    games: [...state.games] as [number, number],
    points: [...state.points] as [string, string],
    servingTeam: state.servingTeam,
  };

  const t = team - 1; // 0 or 1
  const o = 1 - t;    // opponent index

  const tp = s.points[t];
  const op = s.points[o];

  // Deuce / Advantage logic
  if (tp === "40" && op === "40") {
    // Deuce → Advantage
    s.points[t] = "AD";
    return s;
  }

  if (tp === "AD") {
    // Advantage → Win game
    return winGame(s, team);
  }

  if (op === "AD") {
    // Opponent had advantage → back to deuce
    s.points[o] = "40";
    return s;
  }

  if (tp === "40") {
    // Win game
    return winGame(s, team);
  }

  // Normal progression: 0 → 15 → 30 → 40
  const idx = POINT_SEQUENCE.indexOf(tp);
  s.points[t] = POINT_SEQUENCE[idx + 1];
  return s;
}

function winGame(state: ScoreState, team: 1 | 2): ScoreState {
  const s = { ...state };
  const t = team - 1;
  const o = 1 - t;

  // Reset points
  s.points = ["0", "0"];

  // Toggle serve
  s.servingTeam = s.servingTeam === 1 ? 2 : 1;

  // Increment games
  s.games[t]++;

  // Check if set is won (first to 6, must win by 2, or 7-6 tiebreak)
  if (s.games[t] >= 6 && s.games[t] - s.games[o] >= 2) {
    return winSet(s, team);
  }

  // Tiebreak at 7-6 is a set win
  if (s.games[t] === 7 && s.games[o] === 6) {
    return winSet(s, team);
  }

  return s;
}

function winSet(state: ScoreState, team: 1 | 2): ScoreState {
  const s = { ...state };
  const t = team - 1;

  s.sets[t]++;
  s.games = [0, 0];

  return s;
}

/** Convert ScoreState to API update params */
export function toApiParams(state: ScoreState) {
  return {
    score1Sets: state.sets[0],
    score2Sets: state.sets[1],
    score1Games: state.games[0],
    score2Games: state.games[1],
    score1Points: state.points[0],
    score2Points: state.points[1],
    servingTeam: state.servingTeam,
  };
}
