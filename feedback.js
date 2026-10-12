// ---- Help & Feedback (SCFeedback.Submit) ----------------------------------------------------------------
// Files the report as a player event (queryable in PlayFab) and forwards it to the team's Discord channel.
// The webhook URL lives in Title Internal Data under FEEDBACK_WEBHOOK_KEY - server-side only, so it can't be
// pulled out of the client and spammed. No key set = reports are still filed, just not forwarded.
var FEEDBACK_WEBHOOK_KEY = "feedbackWebhook";
var FEEDBACK_MAX_PER_DAY = 5;

handlers.submitFeedback = function(args) {
    args = args || {};

    // Rate limit per player: timestamps of today's sends in internal (player-invisible) data.
    var now = Date.now();
    var dayAgo = now - 24 * 60 * 60 * 1000;
    var internal = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: ["fb_sent"] });
    var sent = [];
    if (internal.Data && internal.Data.fb_sent) {
        try { sent = JSON.parse(internal.Data.fb_sent.Value) || []; } catch (e) { sent = []; }
    }
    sent = sent.filter(function(t) { return t > dayAgo; });
    if (sent.length >= FEEDBACK_MAX_PER_DAY) {
        return { ok: false, reason: "rate_limited" };
    }
    sent.push(now);
    server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: { fb_sent: JSON.stringify(sent) } });

    var clip = function(v, n) { v = v == null ? "" : String(v); return v.length > n ? v.substring(0, n) : v; };
    var report = {
        mood: clip(args.mood, 16),
        category: clip(args.category, 24),
        message: clip(args.message, 1000),
        // "source" is a reserved PlayFab event field.
        origin: clip(args.source, 32),
        context: clip(args.context, 300),
        version: clip(args.version, 32),
        platform: clip(args.platform, 32),
        os: clip(args.os, 80),
        device: clip(args.device, 80),
        screen: clip(args.screen, 64),
        session: args.session | 0,
        matches: args.matches | 0,
        spender: !!args.spender
    };

    server.WritePlayerEvent({ PlayFabId: currentPlayerId, EventName: "feedback_submitted", Body: report });

    var title = server.GetTitleInternalData({ Keys: [FEEDBACK_WEBHOOK_KEY] });
    var webhook = title.Data ? title.Data[FEEDBACK_WEBHOOK_KEY] : null;
    if (!webhook) return { ok: true, forwarded: false };

    var urgent = report.category === "LostProgress" || report.category === "Purchase";
    var header = (urgent ? "🚨 " : "") + "**" + report.category + "** · " + report.mood + " · v" + report.version
        + " · " + report.platform + " · " + report.device
        + "\nPlayer `" + currentPlayerId + "` · session " + report.session + " · " + report.matches + " matches"
        + (report.spender ? " · 💰 spender" : "") + " · from " + report.origin + " on " + report.screen;
    var content = header
        + (report.context ? "\n> " + report.context : "")
        + (report.message ? "\n\n" + report.message : "\n\n_(no message)_");

    var payload = { content: clip(content, 1990), allowed_mentions: { parse: [] } };
    var logText = clip(args.log, 3800);
    if (logText) payload.embeds = [{ title: "Recent log", description: "```\n" + logText + "\n```" }];

    try {
        http.request(webhook, "post", JSON.stringify(payload), "application/json");
    } catch (e) {
        log("feedback webhook failed: " + e);
        return { ok: true, forwarded: false };
    }
    return { ok: true, forwarded: true };
};
