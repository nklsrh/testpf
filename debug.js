// Currency handlers.
//
// ⚠️ These are the game's LIVE currency sync, not just a debug menu: SCCurrencySync pushes every player's CR, GD, MR and EC balance
// through DebugSetCurrency (see SCBackend.PushCurrencyBalance), and the server believes whatever the client sends. That is why they
// cannot simply be locked down - doing so would stop every balance reaching PlayFab. The fix is an economy the server decides
// (server-granted rewards), not a guard here.

// Adds `args.amount` of `args.currency`, or takes it when negative.
handlers.DebugAddCurrency = function (args)
{
	var balances = GetInventory().VirtualCurrency;

	if (args.amount > 0)
	{
		AddVc(balances, args.currency, args.amount);
	}
	else
	{
		SubtractVc(balances, args.currency, -args.amount);
	}

	return JSON.stringify({ result: true });
};

// Sets the balance of `args.currency` to `args.amount`.
handlers.DebugSetCurrency = function (args)
{
	var balances = GetInventory().VirtualCurrency;
	var delta = args.amount - (balances[args.currency] || 0);

	if (delta >= 0)
	{
		AddVc(balances, args.currency, delta);
	}
	else
	{
		SubtractVc(balances, args.currency, -delta);
	}

	return JSON.stringify({ result: true });
};
