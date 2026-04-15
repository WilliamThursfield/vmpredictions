import { calculatePredictionScore } from "../shared/scoring.js";
import { createLeague, ensureStoreReady, getExistingLeagueCodes, getLeague, saveLeague } from "./store.js";

function jsonResponse(status, body) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function generateLeagueCode(existingLeagues) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (existingLeagues.includes(code));

  return code;
}

function generateAdminCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function sanitizePlayerName(name) {
  return String(name ?? "").trim().slice(0, 40);
}

function summarizeLeague(league) {
  const groupMatches = league.actualResults?.groupMatches ?? [];
  const knockoutMatches = league.actualResults?.knockoutMatches ?? [];
  const completedMatches = [...groupMatches, ...knockoutMatches].filter(
    (match) => match.homeScore !== "" && match.awayScore !== ""
  ).length;

  return {
    code: league.code,
    name: league.name,
    createdAt: league.createdAt,
    entryCount: league.entries.length,
    hasActualResults: Boolean(league.actualResults),
    liveResultsCount: completedMatches,
    totalMatches: 104,
    lastActualUpdate: league.actualResults?.savedAt ?? null,
    isLocked: Boolean(league.isLocked),
    lockedAt: league.lockedAt ?? null,
    players: league.entries.map((entry) => ({
      playerName: entry.playerName,
      submittedAt: entry.submittedAt,
    })),
  };
}

function computeLeaderboard(league) {
  const entries = [...league.entries].sort((left, right) =>
    left.playerName.localeCompare(right.playerName, "nb")
  );

  if (!league.actualResults) {
    return entries.map((entry) => ({
      playerName: entry.playerName,
      submittedAt: entry.submittedAt,
      total: null,
      breakdown: [],
    }));
  }

  return entries
    .map((entry) => {
      const result = calculatePredictionScore(entry.snapshot, league.actualResults);
      return {
        playerName: entry.playerName,
        submittedAt: entry.submittedAt,
        total: result.total,
        breakdown: result.breakdown,
      };
    })
    .sort((left, right) => {
      if ((right.total ?? -1) !== (left.total ?? -1)) {
        return (right.total ?? -1) - (left.total ?? -1);
      }
      return left.playerName.localeCompare(right.playerName, "nb");
    });
}

async function parseBody(bodyText) {
  if (!bodyText) {
    return {};
  }

  return JSON.parse(bodyText);
}

export async function handleApiRequest({ method, pathname, bodyText }) {
  await ensureStoreReady();

  const segments = pathname.split("/").filter(Boolean);

  if (method === "POST" && pathname === "/api/leagues") {
    const body = await parseBody(bodyText);
    const leagueName = String(body.leagueName ?? "").trim().slice(0, 80);

    if (!leagueName) {
      return jsonResponse(400, { error: "League name is required." });
    }

    const existingCodes = await getExistingLeagueCodes();
    const code = generateLeagueCode(existingCodes);
    const adminCode = generateAdminCode();
    const league = {
      code,
      name: leagueName,
      createdAt: new Date().toISOString(),
      adminCode,
      isLocked: false,
      lockedAt: null,
      entries: [],
      actualResults: null,
    };

    await createLeague(league);

    return jsonResponse(201, {
      league: summarizeLeague(league),
      adminCode,
    });
  }

  if (segments[0] !== "api" || segments[1] !== "leagues" || !segments[2]) {
    return jsonResponse(404, { error: "API route not found." });
  }

  const leagueCode = segments[2].toUpperCase();
  const league = await getLeague(leagueCode);

  if (!league) {
    return jsonResponse(404, { error: "League not found." });
  }

  if (method === "GET" && segments.length === 3) {
    return jsonResponse(200, { league: summarizeLeague(league) });
  }

  if (method === "GET" && segments[3] === "leaderboard") {
    return jsonResponse(200, {
      league: summarizeLeague(league),
      leaderboard: computeLeaderboard(league),
    });
  }

  if (method === "POST" && segments[3] === "entries") {
    const body = await parseBody(bodyText);
    const playerName = sanitizePlayerName(body.playerName);
    const snapshot = body.snapshot;
    const boardState = body.boardState;

    if (!playerName || !snapshot || !boardState) {
      return jsonResponse(400, { error: "playerName, snapshot and boardState are required." });
    }

    if (league.isLocked) {
      return jsonResponse(403, { error: "Predictions are locked for this league." });
    }

    league.entries = league.entries.filter((entry) => entry.playerName !== playerName);
    league.entries.push({
      playerName,
      snapshot,
      boardState,
      submittedAt: new Date().toISOString(),
    });

    await saveLeague(league);

    return jsonResponse(200, {
      league: summarizeLeague(league),
      savedEntry: { playerName, submittedAt: league.entries.at(-1).submittedAt },
    });
  }

  if (method === "GET" && segments[3] === "entries" && segments[4]) {
    const playerName = decodeURIComponent(segments[4]);
    const entry = league.entries.find((item) => item.playerName === playerName);

    if (!entry) {
      return jsonResponse(404, { error: "Entry not found." });
    }

    return jsonResponse(200, { entry });
  }

  if (method === "POST" && segments[3] === "lock") {
    const body = await parseBody(bodyText);

    if (!body.adminCode || body.adminCode !== league.adminCode) {
      return jsonResponse(403, { error: "Invalid admin code." });
    }

    league.isLocked = true;
    league.lockedAt = new Date().toISOString();
    await saveLeague(league);

    return jsonResponse(200, { league: summarizeLeague(league) });
  }

  if (method === "POST" && segments[3] === "actual-results") {
    const body = await parseBody(bodyText);

    if (!body.snapshot || !body.adminCode) {
      return jsonResponse(400, { error: "snapshot and adminCode are required." });
    }

    if (body.adminCode !== league.adminCode) {
      return jsonResponse(403, { error: "Invalid admin code." });
    }

    league.actualResults = {
      ...body.snapshot,
      savedAt: new Date().toISOString(),
    };
    await saveLeague(league);

    return jsonResponse(200, {
      league: summarizeLeague(league),
      leaderboard: computeLeaderboard(league),
    });
  }

  if (method === "GET" && segments[3] === "actual-results") {
    return jsonResponse(200, { actualResults: league.actualResults });
  }

  return jsonResponse(404, { error: "API route not found." });
}
