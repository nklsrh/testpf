// ---- Live event energy refills (supercricketu-fresh SCTournamentLiveEvent) ----------------------------------------
// Live events spend EC, the energy virtual currency whose cap and recharge are set in Game Manager. The spend is
// PlayMatchEnergy; this is the other half: one EC for a watched ad, or a refill to the cap for gems. Both write EC on
// the server, so a recharge PlayFab has banked is never overwritten by a client balance.
//
// The gems are taken on the client (gems are a client-pushed mirror, see SCCurrencySync), so this cannot see them
// paid. The daily caps below bound what a forged call can get: at most a few refills of a few matches a day.
//
// Arguments: {"mode": "ad"} or {"mode": "gems"}. Returns {ok, balance, reason}.

var LE_REFILL_KEY = "leRefills";
var LE_ADS_PER_DAY = 6;
var LE_GEM_REFILLS_PER_DAY = 5;

handlers.refillEventEnergy = function (args) {
    var mode = args && args.mode === "gems" ? "gems" : "ad";
    var today = new Date().toISOString().substring(0, 10);

    var used = readInternal(LE_REFILL_KEY) || {};
    if (used.day !== today) used = { day: today, ad: 0, gems: 0 };
    var cap = mode === "gems" ? LE_GEM_REFILLS_PER_DAY : LE_ADS_PER_DAY;
    if ((used[mode] || 0) >= cap) return { ok: false, reason: "cap" };

    var inventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var balance = (inventory.VirtualCurrency || {})[ENERGY_CURRENCY] || 0;
    var recharge = (inventory.VirtualCurrencyRechargeTimes || {})[ENERGY_CURRENCY];
    var max = recharge && recharge.RechargeMax ? recharge.RechargeMax : 5;

    var amount = mode === "gems" ? max - balance : Math.min(1, max - balance);
    if (amount <= 0) return { ok: false, reason: "full", balance: balance };

    var result = server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, VirtualCurrency: ENERGY_CURRENCY, Amount: amount });
    used[mode] = (used[mode] || 0) + 1;
    writeInternal(LE_REFILL_KEY, used);
    return { ok: true, balance: result.Balance };
};
