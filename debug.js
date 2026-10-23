// DebugAddCurrency was removed: nothing in the client calls it, and it let any signed-in caller grant themselves any amount.

handlers.DebugSetCurrency = function(args)
{
	var GetUserInventoryRequest =
	{
        "PlayFabId": currentPlayerId
    };

    var cur = args.currency;
	var amt = Math.floor(Number(args.amount));

	var results = {};
		results.result = true;

	if (!GUARDED_CURRENCIES[cur] || !(amt >= 0))
	{
		log.debug("DebugSetCurrency rejected " + cur + " : " + args.amount);
		return JSON.stringify(results);
	}

	// Event tickets are the server's: spent by PlayMatchEnergy, refilled by refillEventEnergy, recharged by PlayFab.
	// Clients from 23 Oct never push them; an older client's push is ignored, since letting it set EC back to the
	// cap after every match was unlimited tickets.
	if (cur === ENERGY_CURRENCY)
	{
		log.debug("DebugSetCurrency ignored " + cur + " : " + args.amount);
		return JSON.stringify(results);
	}

    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	var balance = userVcBalances[cur] || 0;

	// Event energy can only be pushed up to its recharge max. Only increases are capped: a balance already above it
	// (energy bought or granted) is left alone.
	if (cur === ENERGY_CURRENCY && amt > balance)
	{
		var recharge = GetUserInventoryResult.VirtualCurrencyRechargeTimes;
		var max = (recharge && recharge[cur] && recharge[cur].RechargeMax) || EC_MAX_BALANCE;
		amt = Math.min(amt, Math.max(balance, max));
	}

	var delta = amt - balance;

	log.debug("DebugSetCurrency " + cur + " : " + amt + " :delta " + delta);

	if (cur === GOLD_VC || cur === CASH_VC)
	{
		var paid = paidCents();

		// A balance edited in before this guard existed - flagged whichever way this push goes, left for review.
		if (isAbsurdBalance(cur, balance, paid))
		{
			flagSuspect(cur + "_absurd_balance", { balance: balance, paidCents: paid });
		}

		if (delta > 0) delta = budgetIncrease(cur, delta, paid);
	}

	if (delta > 0)
	{
		AddVc(userVcBalances, cur, delta);
	}
	else if (delta < 0)
	{
		SubtractVc(userVcBalances, cur, Math.abs(delta));
	}

	results.balance = balance + delta;
	return JSON.stringify(results);
};



//TEMPORARY solution until PlayFab's log functions are available from CloudScript
function Log(message, data) {
    server.SetTitleData({
        Key: GetISOTimestamp(),
        Value: message + ' ' + JSON.stringify(data)
    });
}