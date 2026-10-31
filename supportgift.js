// ---- Support gifts (Menu_Popup_Inventory.SupportGiftPack) ------------------------------------------------
// Drops one `support_gift` catalog item into the player's inventory with what it pays written on the item:
// custom data `reward` (pack drops separated by ";", e.g. "Currency_CR|2000;Currency_GD|20") and `reason`
// (shown on the gift screen). The client turns that into a pack the player taps to claim, which consumes it.
//
// A `Pack|<packId>` drop is different: it grants that pack's own catalog item, which every build already
// opens from the gift screen, with `reason` and `giftId` on it. It never goes into `reward`, because older
// builds read every reward entry as a pack drop and throw on one without an underscore.
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
// Unlimited_Minutes|N is unlimited event tickets for N minutes, paid by the client on the claim (builds 3220 and up).
// Cricketer_ takes the filters MasterCricketerList.GetPoolFromGachaItem reads, ANDed: IntId:1512 is one card,
// CardType:gold|Nationality:india a random one. A filter that matches nobody pays nothing. Values are
// pinned per filter because the client parses OVR and Type without a guard.
var GIFT_CARD_TAG = "(IntId:\\d+|CardType:[A-Za-z0-9]+|CardTypeIn:[A-Za-z0-9,]+|Nationality:[A-Za-z]+|MinOvr:\\d+|MaxOvr:\\d+|Type:(keep|bat|bowl))";
var GIFT_DROP = new RegExp("^((Currency_(CR|GD)|Unlimited_Minutes)\\|(\\d+)|Cricketer_" + GIFT_CARD_TAG + "(\\|" + GIFT_CARD_TAG + ")*)$");
var GIFT_PACK = /^Pack\|([A-Za-z0-9_-]{1,64})$/;
var GIFT_MAX = { CR: 100000, GD: 1000, Unlimited_Minutes: 1440 };
var GIFT_MAX_DROPS = 20;
var GIFT_MAX_PACKS = 5;

// {reward, packs} with the drops for the support_gift item and the pack ids to grant, or null if any entry is bad.
function supportGiftDrops(reward) {
    var all = String(reward || "").split(";").map(function (d) { return d.trim(); }).filter(function (d) { return d.length > 0; });
    if (all.length === 0 || all.length > GIFT_MAX_DROPS) return null;
    var drops = [], packs = [];
    for (var i = 0; i < all.length; i++) {
        var p = GIFT_PACK.exec(all[i]);
        if (p) { packs.push(p[1]); continue; }
        var m = GIFT_DROP.exec(all[i]);
        if (!m) return null;
        var kind = m[3] || m[2];
        if (m[2] && (parseInt(m[4], 10) <= 0 || parseInt(m[4], 10) > GIFT_MAX[kind])) return null;
        drops.push(all[i]);
    }
    if (packs.length > GIFT_MAX_PACKS) return null;
    return { reward: drops.join(";"), packs: packs };
}

// The packs a gift can carry: in the live `packs` title data, which is what the client opens, and with a
// consumable catalog item, because claiming a gift consumes it and a durable one would sit there unclaimable.
// The gift page's pack list (web/challenge/api/gift.js) applies the same rule.
function giftablePacks() {
    var data = server.GetTitleData({ Keys: ["packs"] }).Data || {};
    var ids = {};
    try { (JSON.parse(data.packs || "{}").packs || []).forEach(function (p) { if (p && p.id) ids[p.id] = true; }); } catch (e) { }
    var giftable = {};
    (server.GetCatalogItems({}).Catalog || []).forEach(function (item) {
        if (ids[item.ItemId] && item.Consumable && item.Consumable.UsageCount > 0) giftable[item.ItemId] = true;
    });
    return giftable;
}

handlers.grantSupportGift = function (args) {
    args = args || {};

    // Trimmed of spaces and quote marks on both sides: Game Manager's editors keep whatever was pasted.
    var bare = function (v) { return String(v == null ? "" : v).trim().replace(/^["']+|["']+$/g, ""); };
    var keyData = server.GetTitleInternalData({ Keys: [GIFT_KEY_NAME] }).Data || {};
    if (!bare(keyData[GIFT_KEY_NAME])) {
        return { ok: false, reason: "key_not_set: add " + GIFT_KEY_NAME + " to Title Internal Data" };
    }
    if (bare(args.key) !== bare(keyData[GIFT_KEY_NAME])) {
        return { ok: false, reason: "not_authorised: key does not match " + GIFT_KEY_NAME };
    }

    var giftId = String(args.giftId || "").trim();
    var parsed = supportGiftDrops(args.reward);
    var reason = String(args.reason || "").substring(0, 120);
    if (!giftId || !parsed) {
        log.error("grantSupportGift: bad arguments", { giftId: giftId, reward: args.reward });
        return { ok: false, reason: "bad_arguments" };
    }
    var reward = parsed.reward;
    if (parsed.packs.length > 0) {
        var giftable = giftablePacks();
        var missing = parsed.packs.filter(function (id) { return !giftable[id]; });
        if (missing.length > 0) return { ok: false, reason: "not_giftable: " + missing.join(", ") };
    }

    var internal = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: [GIFT_SENT_KEY] }).Data || {};
    var sent = [];
    if (internal[GIFT_SENT_KEY]) {
        try { sent = JSON.parse(internal[GIFT_SENT_KEY].Value) || []; } catch (e) { sent = []; }
    }

    var alreadySent = sent.indexOf(giftId) >= 0;
    if (!alreadySent) {
        var itemIds = (reward ? [GIFT_ITEM_ID] : []).concat(parsed.packs);
        var granted = server.GrantItemsToUser({ PlayFabId: currentPlayerId, ItemIds: itemIds, Annotation: giftId });
        var results = granted.ItemGrantResults || [];
        if (results.length !== itemIds.length || results.some(function (r) { return !r.Result; })) {
            log.error("grantSupportGift: grant failed", { giftId: giftId, itemIds: itemIds });
            return { ok: false, reason: "grant_failed" };
        }

        results.forEach(function (instance) {
            var data = { reason: reason, giftId: giftId };
            if (instance.ItemId === GIFT_ITEM_ID) data.reward = reward;
            server.UpdateUserInventoryItemCustomData({ PlayFabId: currentPlayerId, ItemInstanceId: instance.ItemInstanceId, Data: data });
        });

        // Recorded only after the gift is complete, so a failure part-way is retried on the next run.
        sent.push(giftId);
        server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: { gifts_sent: JSON.stringify(sent.slice(-50)) } });
        server.WritePlayerEvent({ PlayFabId: currentPlayerId, EventName: "support_gift_granted", Body: { giftId: giftId, reward: reward, packs: parsed.packs, reason: reason } });
    }

    // alreadySent lets the gift page say "already had it" rather than claim a second send.
    return { ok: true, giftId: giftId, alreadySent: alreadySent };
};
