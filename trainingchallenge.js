// Training challenge boards, kept in Shared Group Data.
//
// A challenge has an id made by the sender's game: <senderPlayFabId>D<drill>K<seed>. Every player who runs it posts their best
// score here, and the board is the group's data: one entry per player, keyed by their PlayFab id. Nobody has to be a PlayFab
// friend of anybody - the id in the link is the only thing that puts a player on a board.
//
// Scores come from the client and are not verified, so the cap below is a sanity limit, not cheat protection.

var CHALLENGE_MAX_ENTRIES = 20;
var CHALLENGE_MAX_SCORE = 5000;

// Parses an id into its sender, drill and seed, or null if it is not one. PlayFab ids are hex, which can contain "D", so the
// drill and seed are read from the end.
function parseChallengeId(id)
{
    if (typeof id !== "string") return null;
    var match = /^([A-F0-9]{8,20})D(\d{1,2})K(\d{1,10})$/.exec(id);
    return match ? { sender: match[1], drill: match[2], seed: match[3] } : null;
}

function challengeGroupId(id)
{
    return "CH" + id;
}

// The board's entries, best first. Player ids stay on the server: a reader only learns which entry is theirs.
function challengeEntries(groupId)
{
    var result = server.GetSharedGroupData({ SharedGroupId: groupId });
    var entries = [];
    for (var playerId in result.Data) {
        try {
            var entry = JSON.parse(result.Data[playerId].Value);
            entries.push({ name: entry.n, score: entry.s, me: playerId === currentPlayerId });
        } catch (e) { /* a damaged entry is skipped, not fatal */ }
    }
    entries.sort(function (a, b) { return b.score - a.score; });
    return entries;
}

function challengeGroupExists(groupId)
{
    try {
        server.GetSharedGroupData({ SharedGroupId: groupId });
        return true;
    } catch (e) {
        return false;
    }
}

handlers.submitChallengeScore = function (args, context) {
    var parsed = parseChallengeId(args.id);
    var score = Math.floor(Number(args.score));
    if (!parsed || !(score >= 0) || score > CHALLENGE_MAX_SCORE) return { ok: false, error: "bad request" };

    var groupId = challengeGroupId(args.id);

    // Only the sender starts a board, so a board cannot be conjured for an id nobody was sent: anyone else can only join one.
    if (!challengeGroupExists(groupId)) {
        if (parsed.sender !== currentPlayerId) return { ok: false, error: "no such challenge" };
        server.CreateSharedGroup({ SharedGroupId: groupId });
    }

    // Names are shown in the game's UI: no markup.
    var name = String(args.name || "Player").replace(/[<>]/g, "").substring(0, 24);

    var entries = challengeEntries(groupId);
    var mine = null;
    for (var i = 0; i < entries.length; i++) if (entries[i].me) mine = entries[i];

    if (!mine && entries.length >= CHALLENGE_MAX_ENTRIES) return { ok: false, error: "full", entries: entries };

    // Only a better score replaces a player's entry.
    if (!mine || score > mine.score) {
        var data = {};
        data[currentPlayerId] = JSON.stringify({ n: name, s: score });
        server.UpdateSharedGroupData({ SharedGroupId: groupId, Data: data });
    }

    return { ok: true, entries: challengeEntries(groupId) };
};

handlers.getChallengeBoard = function (args, context) {
    if (!parseChallengeId(args.id)) return { ok: false, error: "bad request" };

    var groupId = challengeGroupId(args.id);
    if (!challengeGroupExists(groupId)) return { ok: true, entries: [] };

    return { ok: true, entries: challengeEntries(groupId) };
};
