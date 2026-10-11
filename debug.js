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

    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	var balance = userVcBalances[cur] || 0;

	if (cur === ENERGY_CURRENCY)
	{
		amt = Math.min(amt, EC_MAX_BALANCE);
	}

	var delta = amt - balance;

	log.debug("DebugSetCurrency " + cur + " : " + amt + " :delta " + delta);

	if (delta > 0 && (cur === GOLD_VC || cur === CASH_VC))
	{
		var paid = paidCents();

		// A balance that was edited in before this guard existed: flag it, leave it for review.
		if (paid === 0 && ((cur === GOLD_VC && balance > GD_ABSURD) || (cur === CASH_VC && balance > CR_ABSURD)))
		{
			flagSuspect(cur + "_absurd_balance", { balance: balance });
		}

		delta = budgetIncrease(cur, delta, paid);
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