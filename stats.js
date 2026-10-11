// Leaderboard statistics, written by the server.
//
// The client used to post its own statistics, so any number could reach a public board. With client statistic writes
// turned off in the title settings, this is the only way in: every statistic the game posts must match a rule below, and a
// value that no real run could produce is dropped and the player flagged. Flagged players' values are still written - the
// client hides them from everyone else's boards - so a flagged player sees nothing change.
//
// A rise bigger than a rule's step is not refused but clamped: a legitimately offline player catches up over a few submits
// instead of being stuck. Only a rise far past the step is treated as a sign of editing.
//
// The caps are generous first guesses. Tune them against real top scores before tightening.
var INNINGS_MAX = 400;            // one Weekly Innings attempt; a week sums seven daily bests
var STEP_FLAG_MULTIPLE = 5;       // a rise this many steps past the limit gets flagged

// max: the highest value the statistic can hold. step: the most it can rise in one submit (null = no limit). The step only
// applies once the player has a value, so a first submit is checked against max alone - except where stepFromZero says
// a fresh statistic really does start at zero (a new week's innings total).
var STAT_RULES = [
	{ pattern: /^Trophies$/, max: 50000, step: 500 },
	{ pattern: /^MatchesPlayed$/, max: 100000, step: 50 },
	{ pattern: /^Wins$/, max: 100000, step: 50 },
	// Squad OVR keeps climbing as new cards and upgrades ship, so its ceiling is title data ("statMaxSquadOverall"),
	// raised without a deploy. The step is what really bounds it: a squad average moves a few points per new card.
	{ pattern: /^SquadOverall$/, max: 200, maxTitleDataKey: "statMaxSquadOverall", step: 15 },
	{ pattern: /^DIW\d{6}D\d{1,2}$/, max: INNINGS_MAX * 7, step: INNINGS_MAX, stepFromZero: true },
	{ pattern: /^TRN\d{6}D\d{1,2}$/, max: 5000, step: null },
	{ pattern: /^event_tier_[A-Za-z0-9_\-]{1,64}$/, max: 1000000, step: null },
	{ pattern: /^season_[A-Za-z0-9_\-]{1,64}$/, max: 10000000, step: null }
];

function statRule(name)
{
	for (var i = 0; i < STAT_RULES.length; i++)
	{
		if (STAT_RULES[i].pattern.test(name)) return STAT_RULES[i];
	}
	return null;
}

// args.stats: [{ n: statisticName, v: value }]. Returns the names written and the names refused.
handlers.SubmitStats = function(args)
{
	var requested = (args && args.stats) || [];
	var candidates = [];
	var refused = [];

	for (var i = 0; i < requested.length && i < 10; i++)
	{
		var name = String(requested[i].n || "");
		var value = Math.floor(Number(requested[i].v));
		var rule = statRule(name);
		if (!rule || !(value >= 0))
		{
			refused.push(name);
			continue;
		}
		candidates.push({ name: name, value: value, rule: rule });
	}

	if (candidates.length === 0) return { written: [], refused: refused };

	var maxKeys = candidates.filter(function (c) { return c.rule.maxTitleDataKey; }).map(function (c) { return c.rule.maxTitleDataKey; });
	var titleMax = maxKeys.length > 0 ? (server.GetTitleData({ Keys: maxKeys }).Data || {}) : {};

	var current = {};
	var existing = server.GetPlayerStatistics({
		PlayFabId: currentPlayerId,
		StatisticNames: candidates.map(function (c) { return c.name; })
	}).Statistics || [];
	existing.forEach(function (s) { current[s.StatisticName] = s.Value; });

	var updates = [];
	var implausible = {};
	candidates.forEach(function (c)
	{
		var hasValue = current.hasOwnProperty(c.name);
		var before = current[c.name] || 0;
		var value = c.value;
		var max = Number(titleMax[c.rule.maxTitleDataKey]) || c.rule.max;
		if (value > max)
		{
			implausible[c.name] = { before: before, asked: value };
			refused.push(c.name);
			return;
		}
		if (c.rule.step !== null && (hasValue || c.rule.stepFromZero) && value - before > c.rule.step)
		{
			if (value - before > c.rule.step * STEP_FLAG_MULTIPLE) implausible[c.name] = { before: before, asked: value };
			value = before + c.rule.step;
		}
		updates.push({ StatisticName: c.name, Value: value });
	});

	// Wins can never pass matches played, whichever of the two this submit carries.
	var wins = null, matches = null;
	updates.forEach(function (u)
	{
		if (u.StatisticName === "Wins") wins = u;
		if (u.StatisticName === "MatchesPlayed") matches = u;
	});
	var matchCount = matches !== null ? matches.Value : (current["MatchesPlayed"] || 0);
	if (wins !== null && wins.Value > matchCount) wins.Value = matchCount;

	if (updates.length > 0)
	{
		server.UpdatePlayerStatistics({ PlayFabId: currentPlayerId, Statistics: updates });
	}

	if (Object.keys(implausible).length > 0)
	{
		flagSuspect("implausible_stat", implausible);
	}

	return { written: updates.map(function (u) { return u.StatisticName; }), refused: refused };
};
