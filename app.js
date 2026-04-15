import { thirdPlaceCombinationMap } from "./third-place-mapping.js";
import { matchMetadata } from "./match-metadata.js";
import { scoringRules } from "./shared/scoring.js";

const STORAGE_KEY = "world-cup-2026-predictor-v2";
const LEAGUE_PREFS_KEY = "world-cup-2026-league-prefs";
const API_ROOT = "/api";

const overviewItems = [
  {
    title: "Kampdrevet prediction",
    text: "Gruppetabellene regnes ut fra faktiske resultater du skriver inn, ikke fra manuell sortering.",
  },
  {
    title: "Tredjeplasser rangeres",
    text: "Appen plukker ut de åtte beste tredjeplassene basert på poeng, målforskjell og scorede mål.",
  },
  {
    title: "Full bracket",
    text: "Fra round of 32 til finale kan du fylle inn scores og la vinnerne gå videre automatisk.",
  },
  {
    title: "Klar for viderebygging",
    text: "Strukturen er laget for at vi senere kan legge på backend, brukerprofiler og ekte poengutregning.",
  },
];

const groupTemplates = [
  ["A", ["Mexico", "South Africa", "Rep. of Korea", "Czech Rep."]],
  ["B", ["Canada", "Bosnia/Herzeg.", "Qatar", "Switzerland"]],
  ["C", ["Brazil", "Morocco", "Haiti", "Scotland"]],
  ["D", ["USA", "Paraguay", "Australia", "Turkey"]],
  ["E", ["Germany", "Curacao", "Ivory Coast", "Ecuador"]],
  ["F", ["Netherlands", "Japan", "Sweden", "Tunisia"]],
  ["G", ["Belgium", "Egypt", "IR Iran", "New Zealand"]],
  ["H", ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"]],
  ["I", ["France", "Senegal", "Iraq", "Norway"]],
  ["J", ["Argentina", "Algeria", "Austria", "Jordan"]],
  ["K", ["Portugal", "DR Congo", "Uzbekistan", "Colombia"]],
  ["L", ["England", "Croatia", "Ghana", "Panama"]],
];

const groupMatchPattern = [
  [0, 1],
  [2, 3],
  [3, 1],
  [0, 2],
  [3, 0],
  [1, 2],
];

const round32SourceMap = {
  M74: [{ type: "placement", label: "1E" }, { type: "bestThird", slot: "3-ABCDF" }],
  M77: [{ type: "placement", label: "1I" }, { type: "bestThird", slot: "3-CDFGH" }],
  M73: [{ type: "placement", label: "2A" }, { type: "placement", label: "2B" }],
  M75: [{ type: "placement", label: "1F" }, { type: "placement", label: "2C" }],
  M83: [{ type: "placement", label: "2K" }, { type: "placement", label: "2L" }],
  M84: [{ type: "placement", label: "1H" }, { type: "placement", label: "2J" }],
  M81: [{ type: "placement", label: "1D" }, { type: "bestThird", slot: "3-BEFIJ" }],
  M82: [{ type: "placement", label: "1G" }, { type: "bestThird", slot: "3-AEHIJ" }],
  M76: [{ type: "placement", label: "1C" }, { type: "placement", label: "2F" }],
  M78: [{ type: "placement", label: "2E" }, { type: "placement", label: "2I" }],
  M79: [{ type: "placement", label: "1A" }, { type: "bestThird", slot: "3-CEFHI" }],
  M80: [{ type: "placement", label: "1L" }, { type: "bestThird", slot: "3-EHIJK" }],
  M86: [{ type: "placement", label: "1J" }, { type: "placement", label: "2H" }],
  M88: [{ type: "placement", label: "2D" }, { type: "placement", label: "2G" }],
  M85: [{ type: "placement", label: "1B" }, { type: "bestThird", slot: "3-EFGIJ" }],
  M87: [{ type: "placement", label: "1K" }, { type: "bestThird", slot: "3-DEIJL" }],
};

const roundDefinitions = [
  {
    key: "round32",
    title: "Round of 32",
    matches: ["M74", "M77", "M73", "M75", "M83", "M84", "M81", "M82", "M76", "M78", "M79", "M80", "M86", "M88", "M85", "M87"].map(
      (matchId) => ({
        id: matchId,
        label: `Match ${matchId.slice(1)}`,
        homeSource: round32SourceMap[matchId][0],
        awaySource: round32SourceMap[matchId][1],
      })
    ),
  },
  {
    key: "round16",
    title: "Round of 16",
    matches: Array.from({ length: 8 }, (_, index) => ({
      id: `M${89 + index}`,
      label: `Match ${89 + index}`,
      homeSource: { type: "winner", matchId: `M${73 + index * 2}` },
      awaySource: { type: "winner", matchId: `M${74 + index * 2}` },
    })),
  },
  {
    key: "quarterFinals",
    title: "Quarter-finals",
    matches: Array.from({ length: 4 }, (_, index) => ({
      id: `M${97 + index}`,
      label: `Match ${97 + index}`,
      homeSource: { type: "winner", matchId: `M${89 + index * 2}` },
      awaySource: { type: "winner", matchId: `M${90 + index * 2}` },
    })),
  },
  {
    key: "semiFinals",
    title: "Semi-finals",
    matches: Array.from({ length: 2 }, (_, index) => ({
      id: `M${101 + index}`,
      label: `Match ${101 + index}`,
      homeSource: { type: "winner", matchId: `M${97 + index * 2}` },
      awaySource: { type: "winner", matchId: `M${98 + index * 2}` },
    })),
  },
  {
    key: "medalMatches",
    title: "Finals",
    matches: [
      {
        id: "M103",
        label: "Third place",
        homeSource: { type: "loser", matchId: "M101" },
        awaySource: { type: "loser", matchId: "M102" },
      },
      {
        id: "M104",
        label: "Final",
        homeSource: { type: "winner", matchId: "M101" },
        awaySource: { type: "winner", matchId: "M102" },
      },
    ],
  },
];

function createDefaultState() {
  const groups = groupTemplates.map(([name, teamNames]) => ({
    name,
    teams: teamNames.map((teamName, index) => ({
      id: `${name}${index + 1}`,
      name: teamName,
      seed: index + 1,
    })),
    matches: groupMatchPattern.map(([homeIndex, awayIndex], index) => ({
      id: `${name}-${index + 1}`,
      homeId: `${name}${homeIndex + 1}`,
      awayId: `${name}${awayIndex + 1}`,
      homeScore: "",
      awayScore: "",
    })),
  }));

  const knockoutScores = {};

  for (const round of roundDefinitions) {
    for (const match of round.matches) {
      knockoutScores[match.id] = {
        homeScore: "",
        awayScore: "",
        tieWinner: "",
      };
    }
  }

  return { groups, knockoutScores };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createDefaultState();
  }

  try {
    return JSON.parse(raw);
  } catch {
    return createDefaultState();
  }
}

let state = loadState();
let leaguePrefs = loadLeaguePrefs();
let activeLeague = null;
let activeLeaderboard = [];

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadLeaguePrefs() {
  const raw = window.localStorage.getItem(LEAGUE_PREFS_KEY);

  if (!raw) {
    return { playerName: "", leagueCode: "", adminCode: "" };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { playerName: "", leagueCode: "", adminCode: "" };
  }
}

function saveLeaguePrefs() {
  window.localStorage.setItem(LEAGUE_PREFS_KEY, JSON.stringify(leaguePrefs));
}

function setCurrentAdminCode(code) {
  leaguePrefs.adminCode = code.trim().toUpperCase();
  saveLeaguePrefs();
}

function hasAdminAccess() {
  return Boolean(leaguePrefs.adminCode);
}

function predictionsAreLocked() {
  return Boolean(activeLeague?.isLocked) && !hasAdminAccess();
}

function getTeamById(group, teamId) {
  return group.teams.find((team) => team.id === teamId);
}

function getNumericScore(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatMatchDate(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createStandings(group) {
  const table = group.teams.map((team) => ({
    id: team.id,
    name: team.name,
    seed: team.seed,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));

  const byId = Object.fromEntries(table.map((entry) => [entry.id, entry]));

  for (const match of group.matches) {
    const homeScore = getNumericScore(match.homeScore);
    const awayScore = getNumericScore(match.awayScore);

    if (homeScore === null || awayScore === null) {
      continue;
    }

    const home = byId[match.homeId];
    const away = byId[match.awayId];

    home.played += 1;
    away.played += 1;

    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const entry of table) {
    entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
  }

  return table.sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }
    if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
    return left.seed - right.seed;
  });
}

function getGroupSnapshots() {
  return state.groups.map((group) => {
    const standings = createStandings(group);
    return { group, standings };
  });
}

function getQualificationSnapshot() {
  const groupSnapshots = getGroupSnapshots();
  const direct = [];
  const thirds = [];

  for (const snapshot of groupSnapshots) {
    direct.push({
      label: `1${snapshot.group.name}`,
      group: snapshot.group.name,
      ...snapshot.standings[0],
    });
    direct.push({
      label: `2${snapshot.group.name}`,
      group: snapshot.group.name,
      ...snapshot.standings[1],
    });
    thirds.push({
      label: `3${snapshot.group.name}`,
      group: snapshot.group.name,
      ...snapshot.standings[2],
    });
  }

  const sortedThirds = [...thirds].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }
    if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
    return left.group.localeCompare(right.group, "en");
  });

  const bestThirds = sortedThirds.slice(0, 8);
  const qualified = [...direct, ...bestThirds];

  return { groupSnapshots, direct, sortedThirds, bestThirds, qualified };
}

function getQualifiedByLabelMap(qualificationSnapshot) {
  return Object.fromEntries(
    qualificationSnapshot.qualified.map((entry) => [entry.label, entry])
  );
}

function getBestThirdCombinationKey(qualificationSnapshot) {
  return qualificationSnapshot.bestThirds
    .map((entry) => entry.group)
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("");
}

function getMatchScore(matchId) {
  return state.knockoutScores[matchId] ?? {
    homeScore: "",
    awayScore: "",
    tieWinner: "",
  };
}

function getKnockoutTeamLabel(source, qualificationSnapshot = getQualificationSnapshot()) {
  if (!source) {
    return "";
  }

  if (source.type === "placement" || source.type === "bestThird") {
    return resolveQualificationSource(source, qualificationSnapshot)?.label || "";
  }

  if (source.type === "winner") {
    return `Winner ${source.matchId}`;
  }

  if (source.type === "loser") {
    return `Loser ${source.matchId}`;
  }

  return "";
}

function resolveKnockoutTeams(match) {
  const score = getMatchScore(match.id);
  const qualificationSnapshot = getQualificationSnapshot();
  const homeTeam = resolveSource(match.homeSource, qualificationSnapshot);
  const awayTeam = resolveSource(match.awaySource, qualificationSnapshot);

  return { homeTeam, awayTeam, score };
}

function resolveSource(source, qualificationSnapshot = getQualificationSnapshot()) {
  if (!source) {
    return "";
  }

  if (source.type === "placement" || source.type === "bestThird") {
    return resolveQualificationSource(source, qualificationSnapshot)?.name || "";
  }

  const result = getKnockoutResult(source.matchId);

  if (!result) {
    return "";
  }

  if (source.type === "winner") {
    return result.winner;
  }

  if (source.type === "loser") {
    return result.loser;
  }

  return "";
}

function resolveQualificationSource(source, qualificationSnapshot = getQualificationSnapshot()) {
  const qualifiedByLabel = getQualifiedByLabelMap(qualificationSnapshot);

  if (source.type === "placement") {
    return qualifiedByLabel[source.label] ?? null;
  }

  if (source.type !== "bestThird") {
    return null;
  }

  const combinationKey = getBestThirdCombinationKey(qualificationSnapshot);
  const slotAssignment = thirdPlaceCombinationMap[combinationKey];
  const targetGroup = slotAssignment?.[source.slot];

  if (!targetGroup) {
    return null;
  }

  return qualifiedByLabel[`3${targetGroup}`] ?? null;
}

function getGroupFixtureMetadata(match) {
  return Object.values(matchMetadata).find(
    (entry) =>
      entry.homeCode === match.homeId &&
      entry.awayCode === match.awayId
  );
}

function getKnockoutMatchMetadata(matchId) {
  return matchMetadata[matchId] ?? null;
}

function getAllGroupMatchSnapshots() {
  return state.groups.flatMap((group) =>
    group.matches.map((match) => ({
      id: match.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    }))
  );
}

function getAllKnockoutMatchSnapshots() {
  return roundDefinitions.flatMap((round) =>
    round.matches.map((match) => {
      const score = getMatchScore(match.id);
      return {
        id: match.id,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        tieWinner: score.tieWinner,
      };
    })
  );
}

function getKnockoutResult(matchId) {
  const match = roundDefinitions
    .flatMap((round) => round.matches)
    .find((entry) => entry.id === matchId);

  if (!match) {
    return null;
  }

  const { homeTeam, awayTeam, score } = resolveKnockoutTeams(match);
  const homeScore = getNumericScore(score.homeScore);
  const awayScore = getNumericScore(score.awayScore);

  if (!homeTeam || !awayTeam || homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return { winner: homeTeam, loser: awayTeam };
  }

  if (awayScore > homeScore) {
    return { winner: awayTeam, loser: homeTeam };
  }

  if (!score.tieWinner) {
    return null;
  }

  return score.tieWinner === homeTeam
    ? { winner: homeTeam, loser: awayTeam }
    : { winner: awayTeam, loser: homeTeam };
}

function updateGroupScore(groupName, matchId, field, value) {
  const group = state.groups.find((entry) => entry.name === groupName);
  const match = group?.matches.find((entry) => entry.id === matchId);

  if (!match) {
    return;
  }

  match[field] = value;
  saveState();
  renderApp({ preserveFocus: true });
}

function updateKnockoutScore(matchId, field, value) {
  state.knockoutScores[matchId][field] = value;

  if (field !== "tieWinner") {
    state.knockoutScores[matchId].tieWinner = "";
  }

  saveState();
  renderApp({ preserveFocus: true });
}

function resetState() {
  state = createDefaultState();
  saveState();
  renderApp();
}

function createTournamentSnapshot(sourceState = state) {
  const originalState = state;
  state = sourceState;

  const qualificationSnapshot = getQualificationSnapshot();
  const knockoutResults = Object.fromEntries(
    roundDefinitions
      .flatMap((round) => round.matches)
      .map((match) => [match.id, getKnockoutResult(match.id)])
  );

  const participantsForRound = (roundKey) =>
    roundDefinitions
      .find((round) => round.key === roundKey)
      .matches.flatMap((match) => {
        const teams = resolveKnockoutTeams(match);
        return [teams.homeTeam, teams.awayTeam].filter(Boolean);
      });

  const snapshot = {
    savedAt: new Date().toISOString(),
    groupPlacings: Object.fromEntries(
      qualificationSnapshot.groupSnapshots.map((entry) => [
        entry.group.name,
        entry.standings.map((team) => team.name),
      ])
    ),
    qualifiedTeams: qualificationSnapshot.qualified.map((entry) => entry.name),
    bestThirdPlaced: qualificationSnapshot.bestThirds.map((entry) => entry.name),
    bestThirdCombination: getBestThirdCombinationKey(qualificationSnapshot),
    groupMatches: getAllGroupMatchSnapshots(),
    knockoutMatches: getAllKnockoutMatchSnapshots(),
    quarterFinalists: participantsForRound("quarterFinals"),
    semiFinalists: participantsForRound("semiFinals"),
    finalists: participantsForRound("medalMatches").slice(2),
    champion: knockoutResults.M104?.winner ?? "",
    runnerUp: knockoutResults.M104?.loser ?? "",
    bronze: knockoutResults.M103?.winner ?? "",
  };

  state = originalState;
  return snapshot;
}

function setLeagueFeedback(message) {
  document.querySelector("#league-feedback").textContent = message;
}

function setCurrentPlayerName(name) {
  leaguePrefs.playerName = name.trim();
  saveLeaguePrefs();
}

function setCurrentLeagueCode(code) {
  leaguePrefs.leagueCode = code.trim().toUpperCase();
  saveLeaguePrefs();
}

function cloneState(inputState) {
  return JSON.parse(JSON.stringify(inputState));
}

function applyBoardState(nextState) {
  state = cloneState(nextState);
  saveState();
  renderApp();
}

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`${API_ROOT}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "API request failed.");
  }

  return data;
}

async function fetchLeagueSummary(leagueCode) {
  const data = await apiRequest(`/leagues/${leagueCode}`);
  activeLeague = data.league;
  return data.league;
}

async function refreshLeaderboard() {
  if (!leaguePrefs.leagueCode) {
    activeLeaderboard = [];
    activeLeague = null;
    renderLeagueSection();
    return;
  }

  const data = await apiRequest(`/leagues/${leaguePrefs.leagueCode}/leaderboard`);
  activeLeague = data.league;
  activeLeaderboard = data.leaderboard;
  renderLeagueSection();
}

async function createLeague() {
  const playerName = document.querySelector("#player-name").value.trim();
  const leagueName = document.querySelector("#league-name").value.trim();

  if (!playerName) {
    setLeagueFeedback("Skriv inn navnet ditt først.");
    return;
  }

  if (!leagueName) {
    setLeagueFeedback("Skriv inn et navn for leagueen.");
    return;
  }

  setCurrentPlayerName(playerName);
  const data = await apiRequest("/leagues", {
    method: "POST",
    body: { leagueName },
  });
  setCurrentLeagueCode(data.league.code);
  setCurrentAdminCode(data.adminCode);
  document.querySelector("#league-code").value = data.league.code;
  document.querySelector("#admin-code").value = data.adminCode;
  activeLeague = data.league;
  setLeagueFeedback(`League opprettet. Del league-koden ${data.league.code}. Admin-koden din er ${data.adminCode}.`);
  await refreshLeaderboard();
}

async function joinLeague() {
  const playerName = document.querySelector("#player-name").value.trim();
  const leagueCode = document.querySelector("#league-code").value.trim().toUpperCase();
  const adminCode = document.querySelector("#admin-code").value.trim().toUpperCase();

  if (!playerName) {
    setLeagueFeedback("Skriv inn navnet ditt først.");
    return;
  }

  if (!leagueCode) {
    setLeagueFeedback("Skriv inn en league-kode.");
    return;
  }

  setCurrentPlayerName(playerName);
  setCurrentLeagueCode(leagueCode);
  setCurrentAdminCode(adminCode);
  await fetchLeagueSummary(leagueCode);
  setLeagueFeedback(`Du er nå inne i league ${leagueCode}.`);
  await refreshLeaderboard();
}

async function submitLeagueEntry() {
  if (!leaguePrefs.leagueCode || !leaguePrefs.playerName) {
    setLeagueFeedback("Velg league og skriv inn navnet ditt først.");
    return;
  }

  if (activeLeague?.isLocked) {
    setLeagueFeedback("Predictions er låst i denne leagueen.");
    return;
  }

  await apiRequest(`/leagues/${leaguePrefs.leagueCode}/entries`, {
    method: "POST",
    body: {
      playerName: leaguePrefs.playerName,
      snapshot: createTournamentSnapshot(state),
      boardState: state,
    },
  });

  setLeagueFeedback("Prediction sendt inn til leagueen.");
  await refreshLeaderboard();
}

async function loadMyEntry() {
  if (!leaguePrefs.leagueCode || !leaguePrefs.playerName) {
    setLeagueFeedback("Velg league og skriv inn navnet ditt først.");
    return;
  }

  const data = await apiRequest(
    `/leagues/${leaguePrefs.leagueCode}/entries/${encodeURIComponent(leaguePrefs.playerName)}`
  );
  applyBoardState(data.entry.boardState);
  setLeagueFeedback("Din lagrede prediction er lastet inn i boardet.");
}

async function saveActualResultsToLeague() {
  if (!leaguePrefs.leagueCode || !leaguePrefs.adminCode) {
    setLeagueFeedback("Du trenger admin-koden for å oppdatere live fasit.");
    return;
  }

  await apiRequest(`/leagues/${leaguePrefs.leagueCode}/actual-results`, {
    method: "POST",
    body: {
      snapshot: createTournamentSnapshot(state),
      adminCode: leaguePrefs.adminCode,
    },
  });

  setLeagueFeedback("Nåværende board er lagret som fasit for leagueen.");
  await refreshLeaderboard();
}

async function lockLeaguePredictions() {
  if (!leaguePrefs.leagueCode || !leaguePrefs.adminCode) {
    setLeagueFeedback("Du trenger admin-koden for å låse predictions.");
    return;
  }

  await apiRequest(`/leagues/${leaguePrefs.leagueCode}/lock`, {
    method: "POST",
    body: { adminCode: leaguePrefs.adminCode },
  });

  setLeagueFeedback("Predictions er nå låst. Du kan oppdatere live fasit underveis i turneringen.");
  await refreshLeaderboard();
}

function renderOverview() {
  const container = document.querySelector("#overview-cards");
  container.innerHTML = "";

  for (const item of overviewItems) {
    const card = document.createElement("article");
    card.className = "overview-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    `;
    container.append(card);
  }
}

function renderQualificationSummary(snapshot) {
  const qualifiedList = document.querySelector("#qualified-list");
  const thirdPlaceList = document.querySelector("#third-place-list");

  qualifiedList.innerHTML = snapshot.qualified
    .map(
      (entry) =>
        `<li><strong>${entry.label}</strong> ${entry.name} <span>(${entry.points} pts, ${entry.goalDifference >= 0 ? "+" : ""}${entry.goalDifference} GD)</span></li>`
    )
    .join("");

  thirdPlaceList.innerHTML = snapshot.sortedThirds
    .map((entry, index) => {
      const status = index < 8 ? "videre" : "ute";
      return `<li><strong>${entry.label}</strong> ${entry.name} <span>${entry.points} pts, ${status}</span></li>`;
    })
    .join("");
}

function renderGroups(snapshot) {
  const container = document.querySelector("#group-grid");
  container.innerHTML = "";

  for (const groupSnapshot of snapshot.groupSnapshots) {
    const { group, standings } = groupSnapshot;
    const standingsMarkup = standings
      .map((team, index) => {
        const marker =
          index < 2
            ? '<span class="row-marker marker-qualified">Videre</span>'
            : index === 2
              ? '<span class="row-marker marker-third">3. plass</span>'
              : "";

        return `
          <tr>
            <td>${index + 1}</td>
            <td class="team-name-cell">${team.name}</td>
            <td>${marker}</td>
            <td>${team.played}</td>
            <td>${team.wins}</td>
            <td>${team.draws}</td>
            <td>${team.losses}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
            <td>${team.goalDifference >= 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
            <td>${team.points}</td>
          </tr>
        `;
      })
      .join("");

    const fixturesMarkup = group.matches
      .map((match) => {
        const homeTeam = getTeamById(group, match.homeId)?.name ?? "";
        const awayTeam = getTeamById(group, match.awayId)?.name ?? "";
        const metadata = getGroupFixtureMetadata(match);

        return `
          <div class="fixture-row">
            <div class="fixture-id">${metadata?.matchNumber ? `M${metadata.matchNumber}` : match.id}</div>
            <div class="fixture-team fixture-team-home">${homeTeam}</div>
            <div class="score-entry">
              <input
                type="number"
                min="0"
                inputmode="numeric"
                value="${match.homeScore}"
                data-group="${group.name}"
                data-match="${match.id}"
                data-field="homeScore"
                aria-label="${homeTeam} score"
              />
            </div>
            <div class="fixture-separator">:</div>
            <div class="score-entry">
              <input
                type="number"
                min="0"
                inputmode="numeric"
                value="${match.awayScore}"
                data-group="${group.name}"
                data-match="${match.id}"
                data-field="awayScore"
                aria-label="${awayTeam} score"
              />
            </div>
            <div class="fixture-team fixture-team-away">${awayTeam}</div>
            <div class="fixture-meta">
              ${
                metadata
                  ? `
                    <span class="fixture-chip">${metadata.venue}</span>
                    <span class="fixture-chip">${formatMatchDate(metadata.myDateTime || metadata.localDateTime)}</span>
                  `
                  : '<span class="fixture-chip">Kampmetadata kommer</span>'
              }
            </div>
          </div>
        `;
      })
      .join("");

    const card = document.createElement("article");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-card-header">
        <div>
          <h3>Gruppe ${group.name}</h3>
          <p>Seks kamper, automatisk tabell.</p>
        </div>
        <span class="group-tag">${group.name}</span>
      </div>
      <div class="standings-wrap">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Lag</th>
              <th>Status</th>
              <th>K</th>
              <th>S</th>
              <th>U</th>
              <th>T</th>
              <th>MF</th>
              <th>MM</th>
              <th>+/-</th>
              <th>P</th>
            </tr>
          </thead>
          <tbody>${standingsMarkup}</tbody>
        </table>
      </div>
      <div class="fixtures-list">${fixturesMarkup}</div>
    `;

    container.append(card);
  }

  container.querySelectorAll("input[data-group]").forEach((input) => {
    input.disabled = predictionsAreLocked();
    input.addEventListener("input", (event) => {
      const target = event.currentTarget;
      updateGroupScore(
        target.dataset.group,
        target.dataset.match,
        target.dataset.field,
        target.value
      );
    });
  });
}

function renderPodium() {
  const container = document.querySelector("#podium-strip");
  const finalResult = getKnockoutResult("M104");
  const bronzeResult = getKnockoutResult("M103");
  const finalists = roundDefinitions
    .flatMap((round) => round.matches)
    .find((match) => match.id === "M104");
  const resolvedFinal = finalists ? resolveKnockoutTeams(finalists) : null;

  const cards = [
    {
      label: "Verdensmester",
      value: finalResult?.winner || "Ikke valgt ennå",
    },
    {
      label: "Sølv",
      value: finalResult?.loser || resolvedFinal?.awayTeam || "Ikke valgt ennå",
    },
    {
      label: "Bronse",
      value: bronzeResult?.winner || "Ikke valgt ennå",
    },
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <div class="podium-card">
          <span class="eyebrow">${card.label}</span>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderKnockout() {
  const container = document.querySelector("#knockout-board");
  container.innerHTML = "";
  const qualificationSnapshot = getQualificationSnapshot();

  for (const round of roundDefinitions) {
    const column = document.createElement("section");
    column.className = "round-column";

    const matchesMarkup = round.matches
      .map((match) => {
        const { homeTeam, awayTeam, score } = resolveKnockoutTeams(match);
        const homeScore = getNumericScore(score.homeScore);
        const awayScore = getNumericScore(score.awayScore);
        const requiresTieWinner =
          homeTeam &&
          awayTeam &&
          homeScore !== null &&
          awayScore !== null &&
          homeScore === awayScore;

        const tieWinnerMarkup = requiresTieWinner
          ? `
            <select data-knockout="${match.id}" data-field="tieWinner">
              <option value="">Velg vinner etter straffer</option>
              <option value="${homeTeam}" ${
                score.tieWinner === homeTeam ? "selected" : ""
              }>${homeTeam}</option>
              <option value="${awayTeam}" ${
                score.tieWinner === awayTeam ? "selected" : ""
              }>${awayTeam}</option>
            </select>
          `
          : "";

        const metadata = getKnockoutMatchMetadata(match.id);

        const matchupMarkup = `
          <div class="match-team-row">
            <div class="match-team-label">${
              homeTeam || getKnockoutTeamLabel(match.homeSource, qualificationSnapshot)
            }</div>
            <input
              type="number"
              min="0"
              inputmode="numeric"
              value="${score.homeScore}"
              data-knockout="${match.id}"
              data-field="homeScore"
              aria-label="${match.label} home score"
            />
          </div>
          <div class="match-team-row">
            <div class="match-team-label">${
              awayTeam || getKnockoutTeamLabel(match.awaySource, qualificationSnapshot)
            }</div>
            <input
              type="number"
              min="0"
              inputmode="numeric"
              value="${score.awayScore}"
              data-knockout="${match.id}"
              data-field="awayScore"
              aria-label="${match.label} away score"
            />
          </div>
        `;

        return `
          <article class="match-card">
            <div class="match-meta">
              <div class="match-headline">
                <strong>${match.label}</strong>
                <span>${match.id}</span>
              </div>
              <div class="match-meta-chips">
                ${
                  metadata
                    ? `
                      <span class="match-chip">${metadata.venue}</span>
                      <span class="match-chip">${formatMatchDate(metadata.myDateTime || metadata.localDateTime)}</span>
                    `
                    : ""
                }
              </div>
            </div>
            <div class="match-body">
              ${matchupMarkup}
              ${tieWinnerMarkup}
              <div class="match-footnote">
                Ved uavgjort må du velge hvem som går videre etter ekstraomganger eller straffer.
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    column.innerHTML = `
      <h3>${round.title}</h3>
      <div class="matches-stack">${matchesMarkup}</div>
    `;

    container.append(column);
  }
  container.querySelectorAll("[data-knockout]").forEach((input) => {
    input.disabled = predictionsAreLocked();
    input.addEventListener("input", (event) => {
      const target = event.currentTarget;
      updateKnockoutScore(
        target.dataset.knockout,
        target.dataset.field,
        target.value
      );
    });

    input.addEventListener("change", (event) => {
      const target = event.currentTarget;
      updateKnockoutScore(
        target.dataset.knockout,
        target.dataset.field,
        target.value
      );
    });
  });
}

function renderLeagueSection() {
  const playerNameInput = document.querySelector("#player-name");
  const leagueCodeInput = document.querySelector("#league-code");
  const adminCodeInput = document.querySelector("#admin-code");
  const leagueSummary = document.querySelector("#league-summary");
  const adminLockedView = document.querySelector("#admin-locked-view");
  const adminSummary = document.querySelector("#admin-summary");
  const leaderboard = document.querySelector("#leaderboard");
  const submitButton = document.querySelector("#submit-entry-button");
  const loadButton = document.querySelector("#load-entry-button");
  const lockButton = document.querySelector("#lock-league-button");
  const actualButton = document.querySelector("#save-actual-results-button");
  const adminActions = document.querySelector("#admin-actions");

  playerNameInput.value = leaguePrefs.playerName ?? "";
  leagueCodeInput.value = leaguePrefs.leagueCode ?? "";
  adminCodeInput.value = leaguePrefs.adminCode ?? "";

  if (!activeLeague) {
    submitButton.disabled = false;
    loadButton.disabled = false;
    lockButton.disabled = true;
    actualButton.disabled = true;
    adminActions.hidden = true;
    leagueSummary.innerHTML = `
      <p>Ingen league er valgt ennå. Opprett en ny league eller join med kode.</p>
    `;
    adminLockedView.innerHTML = `
      <div class="admin-locked-view">
        <div class="admin-hint">
          Admin-kontrollene blir tilgjengelige når du har valgt en league og lagt inn korrekt admin-kode.
        </div>
      </div>
    `;
    adminSummary.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-item">
          <strong>Ingen admin-tilgang ennå</strong>
          <span>Opprett en league eller skriv inn admin-koden for en eksisterende league.</span>
        </div>
      </div>
    `;
    leaderboard.innerHTML = `<p>Leaderboardet vises når du har valgt en league.</p>`;
    return;
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}?league=${activeLeague.code}`;
  submitButton.disabled = Boolean(activeLeague.isLocked);
  loadButton.disabled = false;
  lockButton.disabled = !hasAdminAccess() || Boolean(activeLeague.isLocked);
  actualButton.disabled = !hasAdminAccess();
  adminActions.hidden = !hasAdminAccess();
  leagueSummary.innerHTML = `
    <div class="league-summary-grid">
      <div class="league-summary-row">
        <span>League</span>
        <strong>${activeLeague.name}</strong>
      </div>
      <div class="league-summary-row">
        <span>Kode</span>
        <strong>${activeLeague.code}</strong>
      </div>
      <div class="league-summary-row">
        <span>Deltakere</span>
        <strong>${activeLeague.entryCount}</strong>
      </div>
      <div class="league-summary-row">
        <span>Status</span>
        <strong class="status-pill ${activeLeague.isLocked ? "status-locked" : "status-open"}">${
          activeLeague.isLocked ? "Predictions låst" : "Predictions åpne"
        }</strong>
      </div>
      <div class="league-summary-row">
        <span>Live fasit</span>
        <strong>${activeLeague.liveResultsCount}/${activeLeague.totalMatches} kamper</strong>
      </div>
      <div class="league-summary-row">
        <span>Del lenke</span>
        <strong><a href="${joinUrl}">${joinUrl}</a></strong>
      </div>
    </div>
  `;

  adminLockedView.innerHTML = hasAdminAccess()
    ? ""
    : `
      <div class="admin-locked-view">
        <div class="admin-hint">
          Kun du som har admin-koden kan se og bruke admin-kontrollene. Alle andre ser bare leaderboardet og sin egen prediction.
        </div>
      </div>
    `;

  const progressPercent = activeLeague.totalMatches
    ? Math.round((activeLeague.liveResultsCount / activeLeague.totalMatches) * 100)
    : 0;

  adminSummary.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-item">
        <strong>Live fasit-status</strong>
        <div class="live-status">
          <span>${activeLeague.liveResultsCount} av ${activeLeague.totalMatches} kamper er oppdatert med ekte resultat.</span>
          <div class="live-status-bar">
            <div class="live-status-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span>${
            activeLeague.lastActualUpdate
              ? `Sist oppdatert ${formatMatchDate(activeLeague.lastActualUpdate)}`
              : "Ingen live fasit er lagt inn ennå."
          }</span>
        </div>
      </div>
      <div class="admin-panel-item">
        <strong>Steg 1: Samle predictions</strong>
        <span>La alle sende inn predictionene sine før du låser leagueen.</span>
      </div>
      <div class="admin-panel-item">
        <strong>Steg 2: Lås predictions</strong>
        <span>${activeLeague.isLocked ? "Leagueen er allerede låst." : "Når alle er ferdige, låser du predictions slik at ingen kan endre noe."}</span>
      </div>
      <div class="admin-panel-item">
        <strong>Steg 3: Oppdater live fasit</strong>
        <span>Bruk boardet under til å legge inn ekte kampresultater dag for dag. Trykk deretter på “Oppdater live fasit”.</span>
      </div>
    </div>
  `;

  if (activeLeaderboard.length === 0) {
    leaderboard.innerHTML = `<p>Ingen predictions er sendt inn ennå i denne leagueen.</p>`;
    return;
  }

  leaderboard.innerHTML = `
    <ul class="leaderboard-list">
      ${activeLeaderboard
        .map((entry, index) => {
          const scoreText = entry.total === null ? "venter på fasit" : `${entry.total} poeng`;
          return `
            <li class="leaderboard-item">
              <span class="leaderboard-rank">${index + 1}</span>
              <div class="leaderboard-name">
                <strong>${entry.playerName}</strong>
                <div>Sendt inn ${formatMatchDate(entry.submittedAt)}</div>
              </div>
              <div class="leaderboard-points">
                <strong>${scoreText}</strong>
              </div>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function renderScoring() {
  const scoreRules = document.querySelector("#score-rules");

  scoreRules.innerHTML = `
    <h3>Poeng fordeling</h3>
    <ul class="score-rule-list">
      ${scoringRules
        .map(
          (rule) =>
            `<li><span>${rule.label}</span><strong>${rule.points}</strong></li>`
        )
        .join("")}
    </ul>
  `;
}

function bindControls() {
  document.querySelector("#reset-button").addEventListener("click", () => {
    if (predictionsAreLocked()) {
      setLeagueFeedback("Predictions er låst i denne leagueen.");
      return;
    }
    resetState();
  });
  document
    .querySelector("#player-name")
    .addEventListener("input", (event) => setCurrentPlayerName(event.currentTarget.value));
  document
    .querySelector("#admin-code")
    .addEventListener("input", (event) => setCurrentAdminCode(event.currentTarget.value));
  document
    .querySelector("#create-league-button")
    .addEventListener("click", async () => {
      try {
        await createLeague();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
  document
    .querySelector("#join-league-button")
    .addEventListener("click", async () => {
      try {
        await joinLeague();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
  document
    .querySelector("#submit-entry-button")
    .addEventListener("click", async () => {
      try {
        await submitLeagueEntry();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
  document
    .querySelector("#load-entry-button")
    .addEventListener("click", async () => {
      try {
        await loadMyEntry();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
  document
    .querySelector("#save-actual-results-button")
    .addEventListener("click", async () => {
      try {
        await saveActualResultsToLeague();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
  document
    .querySelector("#lock-league-button")
    .addEventListener("click", async () => {
      try {
        await lockLeaguePredictions();
      } catch (error) {
        setLeagueFeedback(error.message);
      }
    });
}

function captureRenderContext() {
  const activeElement = document.activeElement;

  if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLSelectElement)) {
    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    };
  }

  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    tagName: activeElement.tagName,
    group: activeElement.dataset.group ?? "",
    match: activeElement.dataset.match ?? "",
    knockout: activeElement.dataset.knockout ?? "",
    field: activeElement.dataset.field ?? "",
    selectionStart:
      activeElement instanceof HTMLInputElement ? activeElement.selectionStart : null,
    selectionEnd:
      activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : null,
  };
}

function restoreRenderContext(context) {
  if (!context) {
    return;
  }

  let selector = "";

  if (context.group && context.match && context.field) {
    selector = `input[data-group="${context.group}"][data-match="${context.match}"][data-field="${context.field}"]`;
  } else if (context.knockout && context.field) {
    selector = context.tagName === "SELECT"
      ? `select[data-knockout="${context.knockout}"][data-field="${context.field}"]`
      : `input[data-knockout="${context.knockout}"][data-field="${context.field}"]`;
  }

  if (selector) {
    const nextActiveElement = document.querySelector(selector);

    if (nextActiveElement instanceof HTMLInputElement || nextActiveElement instanceof HTMLSelectElement) {
      nextActiveElement.focus({ preventScroll: true });

      if (
        nextActiveElement instanceof HTMLInputElement &&
        typeof context.selectionStart === "number" &&
        typeof context.selectionEnd === "number"
      ) {
        nextActiveElement.setSelectionRange(context.selectionStart, context.selectionEnd);
      }
    }
  }

  window.scrollTo(context.scrollX ?? window.scrollX, context.scrollY ?? window.scrollY);
}

function renderApp(options = {}) {
  const renderContext = options.preserveFocus ? captureRenderContext() : null;
  const qualificationSnapshot = getQualificationSnapshot();
  renderOverview();
  renderLeagueSection();
  renderQualificationSummary(qualificationSnapshot);
  renderGroups(qualificationSnapshot);
  renderPodium();
  renderKnockout();
  renderScoring();
  restoreRenderContext(renderContext);
}

async function initializeApp() {
  const params = new URLSearchParams(window.location.search);
  const leagueFromUrl = params.get("league");

  if (leagueFromUrl) {
    setCurrentLeagueCode(leagueFromUrl);
  }

  renderApp();
  bindControls();

  if (leaguePrefs.leagueCode) {
    try {
      await refreshLeaderboard();
      setLeagueFeedback(`Koblet til league ${leaguePrefs.leagueCode}.`);
    } catch (error) {
      setLeagueFeedback(error.message);
    }
  }
}

initializeApp();
