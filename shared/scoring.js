export const scoringRules = [
  { label: "Gruppespill: riktig kamputfall", points: "1 poeng" },
  { label: "Gruppespill: eksakt resultat", points: "2 poeng" },
  { label: "Riktig lag videre fra gruppespillet", points: "2 poeng" },
  { label: "Sluttspill: riktig lag videre", points: "2 poeng" },
  { label: "Sluttspill: eksakt resultat", points: "2 poeng" },
  { label: "Riktig tredjeplass", points: "2 poeng" },
  { label: "Riktig andreplass", points: "3 poeng" },
  { label: "Riktig verdensmester", points: "5 poeng" },
];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getOutcome(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) {
    return "";
  }

  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

function getKnockoutWinner(match) {
  const homeScore = toNumber(match.homeScore);
  const awayScore = toNumber(match.awayScore);

  if (homeScore === null || awayScore === null) {
    return "";
  }

  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return match.tieWinner || "";
}

function matchIsComplete(match) {
  return toNumber(match?.homeScore) !== null && toNumber(match?.awayScore) !== null;
}

export function calculatePredictionScore(prediction, actual) {
  const breakdown = [];

  let groupOutcomeHits = 0;
  let groupExactHits = 0;
  const actualGroupMatches = Object.fromEntries(
    (actual.groupMatches ?? []).map((match) => [match.id, match])
  );

  for (const predictedMatch of prediction.groupMatches ?? []) {
    const actualMatch = actualGroupMatches[predictedMatch.id];

    if (!actualMatch) {
      continue;
    }

    const predictedHome = toNumber(predictedMatch.homeScore);
    const predictedAway = toNumber(predictedMatch.awayScore);
    const actualHome = toNumber(actualMatch.homeScore);
    const actualAway = toNumber(actualMatch.awayScore);

    if (
      predictedHome === null ||
      predictedAway === null ||
      actualHome === null ||
      actualAway === null
    ) {
      continue;
    }

    if (getOutcome(predictedHome, predictedAway) === getOutcome(actualHome, actualAway)) {
      groupOutcomeHits += 1;
    }

    if (predictedHome === actualHome && predictedAway === actualAway) {
      groupExactHits += 1;
    }
  }

  breakdown.push({
    label: "Gruppespill: riktig kamputfall",
    count: groupOutcomeHits,
    points: groupOutcomeHits,
  });

  breakdown.push({
    label: "Gruppespill: eksakt resultat",
    count: groupExactHits,
    points: groupExactHits * 2,
  });

  const allGroupMatchesCompleted =
    (actual.groupMatches ?? []).length > 0 &&
    (actual.groupMatches ?? []).every((match) => matchIsComplete(match));

  const qualifiedHits = allGroupMatchesCompleted
    ? (actual.qualifiedTeams ?? []).filter((team) =>
        (prediction.qualifiedTeams ?? []).includes(team)
      ).length
    : 0;
  breakdown.push({
    label: "Riktig lag videre fra gruppespillet",
    count: qualifiedHits,
    points: qualifiedHits * 2,
  });

  let knockoutWinnerHits = 0;
  let knockoutExactHits = 0;
  const actualKnockoutMatches = Object.fromEntries(
    (actual.knockoutMatches ?? []).map((match) => [match.id, match])
  );

  for (const predictedMatch of prediction.knockoutMatches ?? []) {
    const actualMatch = actualKnockoutMatches[predictedMatch.id];

    if (!actualMatch) {
      continue;
    }

    const predictedHome = toNumber(predictedMatch.homeScore);
    const predictedAway = toNumber(predictedMatch.awayScore);
    const actualHome = toNumber(actualMatch.homeScore);
    const actualAway = toNumber(actualMatch.awayScore);

    if (
      predictedHome === null ||
      predictedAway === null ||
      actualHome === null ||
      actualAway === null
    ) {
      continue;
    }

    if (getKnockoutWinner(predictedMatch) && getKnockoutWinner(predictedMatch) === getKnockoutWinner(actualMatch)) {
      knockoutWinnerHits += 1;
    }

    if (predictedHome === actualHome && predictedAway === actualAway) {
      knockoutExactHits += 1;
    }
  }

  breakdown.push({
    label: "Sluttspill: riktig lag videre",
    count: knockoutWinnerHits,
    points: knockoutWinnerHits * 2,
  });

  breakdown.push({
    label: "Sluttspill: eksakt resultat",
    count: knockoutExactHits,
    points: knockoutExactHits * 2,
  });

  const bronzeMatch = actualKnockoutMatches.M103;
  const finalMatch = actualKnockoutMatches.M104;

  const bronzePoints =
    matchIsComplete(bronzeMatch) && prediction.bronze && prediction.bronze === actual.bronze ? 2 : 0;
  breakdown.push({
    label: "Riktig tredjeplass",
    count: bronzePoints ? 1 : 0,
    points: bronzePoints,
  });

  const runnerUpPoints =
    matchIsComplete(finalMatch) && prediction.runnerUp && prediction.runnerUp === actual.runnerUp ? 3 : 0;
  breakdown.push({
    label: "Riktig andreplass",
    count: runnerUpPoints ? 1 : 0,
    points: runnerUpPoints,
  });

  const championPoints =
    matchIsComplete(finalMatch) && prediction.champion && prediction.champion === actual.champion ? 5 : 0;
  breakdown.push({
    label: "Riktig verdensmester",
    count: championPoints ? 1 : 0,
    points: championPoints,
  });

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { total, breakdown };
}
