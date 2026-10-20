// ---- Season Ticket fan comp (supercricketu-fresh longroom/releases/03-chepauk.md) -------------------------
// Every account created before Chepauk's go-live gets the pass free for three seasons. The client
// (SCPass.ClaimFanComp) asks after each login until it is comped; seasons ending on or before `until`
// are then owned on that save.
//
// Title Data `pass_comp`: {"cutoff": "2026/10/29/00/00", "until": "2027/01/21/00/00"}, UTC, in the
// client's SCUtil.DATE_TIME_FORMAT. Move `cutoff` by hand on publish day; no deploy needed.
//
// Once comped, the answer is kept in read-only data and returned as is, so a later cutoff change never
// takes the comp back from anyone who already has it.

var PASS_COMP_TITLE_KEY = "pass_comp";
var PASS_COMP_USER_KEY = "pass_comp";

// "yyyy/MM/dd/HH/mm" as UTC, or null.
function passCompDate(value) {
    var m = /^(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})\/(\d{2})$/.exec(String(value || "").trim());
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
}

handlers.claimFanComp = function (args) {
    var existing = server.GetUserReadOnlyData({ PlayFabId: currentPlayerId, Keys: [PASS_COMP_USER_KEY] }).Data || {};
    if (existing[PASS_COMP_USER_KEY]) {
        try {
            var kept = JSON.parse(existing[PASS_COMP_USER_KEY].Value);
            if (kept && kept.until) return { comped: true, until: kept.until };
        } catch (e) { }
    }

    var titleData = server.GetTitleData({ Keys: [PASS_COMP_TITLE_KEY] }).Data || {};
    var config = null;
    try { config = JSON.parse(titleData[PASS_COMP_TITLE_KEY] || "null"); } catch (e) { config = null; }
    var cutoff = config && passCompDate(config.cutoff);
    if (!cutoff || !passCompDate(config.until)) {
        return { comped: false, reason: "not_configured" };
    }

    var profile = server.GetPlayerProfile({
        PlayFabId: currentPlayerId,
        ProfileConstraints: { ShowCreated: true }
    }).PlayerProfile;
    var created = profile && profile.Created ? new Date(profile.Created) : null;
    if (!created || created >= cutoff) {
        return { comped: false };
    }

    var record = { until: config.until, created: created.toISOString(), at: new Date().toISOString() };
    server.UpdateUserReadOnlyData({ PlayFabId: currentPlayerId, Data: { pass_comp: JSON.stringify(record) } });
    server.WritePlayerEvent({ PlayFabId: currentPlayerId, EventName: "pass_comp_granted", Body: record });
    return { comped: true, until: config.until };
};
