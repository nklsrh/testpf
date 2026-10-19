// Mutual friends (Weekly Innings friends board, SCBackend.AddMutualFriend).
//
// PlayFab friendships are one-way: a client's AddFriend only puts the other player on the caller's list. The friends board
// wants both players to see each other the moment one accepts the other's challenge link or taps ADD FRIEND, so the server
// adds both directions here.
//
// Rate-limited per player, because the client chooses the id: without a cap one player could push themselves onto many
// strangers' boards.

var FRIENDS_MAX_ADDS_PER_DAY = 30;

function friendsAddOneWay(playerId, friendId)
{
    try {
        server.AddFriend({ PlayFabId: playerId, FriendPlayFabId: friendId });
        return true;
    } catch (e) {
        // Already friends is the common case and is fine; anything else is reported but not fatal.
        var code = e && e.apiErrorInfo && e.apiErrorInfo.apiError ? e.apiErrorInfo.apiError.error : "";
        if (code === "UsersAlreadyFriends") return false;
        log.error("AddFriend " + playerId + " -> " + friendId + " failed: " + JSON.stringify(e));
        return false;
    }
}

handlers.addMutualFriend = function (args) {
    args = args || {};
    var friendId = typeof args.friendId === "string" ? args.friendId : "";
    if (!/^[A-F0-9]{8,20}$/.test(friendId) || friendId === currentPlayerId) {
        return { ok: false, reason: "bad_id" };
    }

    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;
    var internal = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: ["fr_adds"] });
    var adds = [];
    if (internal.Data && internal.Data.fr_adds) {
        try { adds = JSON.parse(internal.Data.fr_adds.Value) || []; } catch (e) { adds = []; }
    }
    adds = adds.filter(function (t) { return t > dayAgo; });
    if (adds.length >= FRIENDS_MAX_ADDS_PER_DAY) {
        return { ok: false, reason: "rate_limited" };
    }

    // The friend must be a real player: AddFriend would fail anyway, but this keeps the reason readable.
    try {
        server.GetPlayerProfile({ PlayFabId: friendId });
    } catch (e) {
        return { ok: false, reason: "no_such_player" };
    }

    var mine = friendsAddOneWay(currentPlayerId, friendId);
    var theirs = friendsAddOneWay(friendId, currentPlayerId);

    adds.push(now);
    server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: { fr_adds: JSON.stringify(adds) } });

    return { ok: true, added: mine || theirs };
};
