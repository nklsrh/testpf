// Training challenge boards, kept in Shared Group Data.
//
// A challenge has an id made by the sender's game: <senderPlayFabId>D<drill>K<seed>. Every player who runs it posts their best
// score here, and the board is the group's data: one entry per player, keyed by their PlayFab id. Nobody has to be a PlayFab
// friend of anybody - the id in the link is the only thing that puts a player on a board.

var CHALLENGE_MAX_ENTRIES = 20;
var CHALLENGE_MAX_SCORE = 100000;

function challengeGroupId(id) {
    // Shared group ids are limited in length and character set; the game only ever sends letters and digits.
    if (typeof id !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
    return "CH" + id;
}

function challengeEntries(groupId) {
    var result = server.GetSharedGroupData({ SharedGroupId: groupId });
    var entries = [];
    for (var playerId in result.Data) {
        try {
            var entry = JSON.parse(result.Data[playerId].Value);
            entries.push({ playerId: playerId, name: entry.n, score: entry.s });
        } catch (e) { /* a damaged entry is skipped, not fatal */ }
    }
    entries.sort(function (a, b) { return b.score - a.score; });
    return entries;
}

handlers.submitChallengeScore = function (args, context) {
    var groupId = challengeGroupId(args.id);
    var score = Math.floor(Number(args.score));
    if (!groupId || !(score >= 0) || score > CHALLENGE_MAX_SCORE) return { ok: false, error: "bad request" };

    var name = String(args.name || "Player").substring(0, 24);
    var me = currentPlayerId;

    // Creating a group that exists errors; that is the normal case after the first player.
    try { server.CreateSharedGroup({ SharedGroupId: groupId }); } catch (e) { }

    var entries = challengeEntries(groupId);
    var mine = null;
    for (var i = 0; i < entries.length; i++) if (entries[i].playerId === me) mine = entries[i];

    if (!mine && entries.length >= CHALLENGE_MAX_ENTRIES) return { ok: false, error: "full", entries: entries };

    // Only a better score replaces a player's entry.
    if (!mine || score > mine.score) {
        if (!mine) {
            try { server.AddSharedGroupMembers({ SharedGroupId: groupId, PlayFabIds: [me] }); } catch (e) { }
        }
        var data = {};
        data[me] = JSON.stringify({ n: name, s: score });
        server.UpdateSharedGroupData({ SharedGroupId: groupId, Data: data });
    }

    return { ok: true, entries: challengeEntries(groupId), me: me };
};

handlers.getChallengeBoard = function (args, context) {
    var groupId = challengeGroupId(args.id);
    if (!groupId) return { ok: false, error: "bad request" };

    try {
        return { ok: true, entries: challengeEntries(groupId), me: currentPlayerId };
    } catch (e) {
        // No such group yet: a challenge nobody has run.
        return { ok: true, entries: [], me: currentPlayerId };
    }
};
