// ---- Support gifts (Menu_Popup_Inventory.SupportGiftPack) ------------------------------------------------
// Drops one `support_gift` catalog item into the player's inventory with what it pays written on the item:
// custom data `reward` (pack drops separated by ";", e.g. "Currency_CR|2000;Currency_GD|20") and `reason`
// (shown on the gift screen). The client turns that into a pack the player taps to claim, which consumes it.
//
// Arguments: {"key": "...", "giftId": "trination-oct26", "reward": "Currency_CR|2000", "reason": "..."}.
// One player: Game Manager > Players > the player > Cloud Script tab > run grantSupportGift.
// Many: a scheduled task, "Actions on each player in a segment" > "Execute Cloud Script", on any segment.
// Steps in supercricketu-fresh COMP_SYSTEM.md.
//
// Any client can call a handler, so it only runs with the key held in Title Internal Data, which clients
// cannot read. Granting is idempotent per giftId, so re-running a task or overlapping segments cannot pay
// anyone twice.

var GIFT_ITEM_ID = "support_gift";
var GIFT_KEY_NAME = "supportGiftKey";
var GIFT_SENT_KEY = "gifts_sent";

// Only the forms the client pays, with ceilings that catch a slipped zero rather than limit real comps.
var GIFT_DROP = /^(Currency_(CR|GD)\|(\d+)|Cricketer_IntId:\d+)$/;
var GIFT_MAX = { CR: 100000, GD: 1000 };

function supportGiftDrops(reward) {
    var drops = String(reward || "").split(";").map(function (d) { return d.trim(); }).filter(function (d) { return d.length > 0; });
    if (drops.length === 0) return null;
    for (var i = 0; i < drops.length; i++) {
        var m = GIFT_DROP.exec(drops[i]);
        if (!m) return null;
        if (m[2] && (parseInt(m[3], 10) <= 0 || parseInt(m[3], 10) > GIFT_MAX[m[2]])) return null;
    }
    return drops.join(";");
}

handlers.grantSupportGift = function (args) {
    args = args || {};

    var keyData = server.GetTitleInternalData({ Keys: [GIFT_KEY_NAME] }).Data || {};
    if (!keyData[GIFT_KEY_NAME] || args.key !== keyData[GIFT_KEY_NAME]) {
        return { ok: false, reason: "not_authorised" };
    }

    var giftId = String(args.giftId || "").trim();
    var reward = supportGiftDrops(args.reward);
    var reason = String(args.reason || "").substring(0, 120);
    if (!giftId || !reward) {
        log.error("grantSupportGift: bad arguments", { giftId: giftId, reward: args.reward });
        return { ok: false, reason: "bad_arguments" };
    }

    var internal = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: [GIFT_SENT_KEY] }).Data || {};
    var sent = [];
    if (internal[GIFT_SENT_KEY]) {
        try { sent = JSON.parse(internal[GIFT_SENT_KEY].Value) || []; } catch (e) { sent = []; }
    }

    var alreadySent = sent.indexOf(giftId) >= 0;
    if (!alreadySent) {
        var granted = server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: [GIFT_ITEM_ID], Annotation: giftId });
        var instance = granted.ItemGrantResults && granted.ItemGrantResults[0];
        if (!instance || !instance.Result) {
            log.error("grantSupportGift: grant failed", { giftId: giftId });
            return { ok: false, reason: "grant_failed" };
        }

        server.UpdateUserInventoryItemCustomData({
            PlayFabId: currentPlayerId,
            ItemInstanceId: instance.ItemInstanceId,
            Data: { reward: reward, reason: reason, giftId: giftId }
        });

        // Recorded only after the gift is complete, so a failure part-way is retried on the next run.
        sent.push(giftId);
        server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: { gifts_sent: JSON.stringify(sent.slice(-50)) } });
        server.WritePlayerEvent({ PlayFabId: currentPlayerId, EventName: "support_gift_granted", Body: { giftId: giftId, reward: reward, reason: reason } });
    }

    // alreadySent lets the gift page say "already had it" rather than claim a second send.
    return { ok: true, giftId: giftId, alreadySent: alreadySent };
};
