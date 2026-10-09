// Debug currency handlers, for the game's debug menu.
//
// Any signed-in client can call any handler, so these refuse everyone except the player ids listed in the title's Internal Data
// under "DebugPlayers" (a JSON array, for example ["ABC123DEF456"]). Without that key nobody can use them.
function IsDebugPlayer()
{
	var data = server.GetTitleInternalData({ Keys: ["DebugPlayers"] }).Data;
	if (!data || !data.DebugPlayers) return false;

	try
	{
		return JSON.parse(data.DebugPlayers).indexOf(currentPlayerId) >= 0;
	}
	catch (ex)
	{
		return false;
	}
}

function DebugRefused()
{
	log.info("Debug currency refused for " + currentPlayerId);
	return JSON.stringify({ result: false, error: "not allowed" });
}

// Adds `args.amount` of `args.currency`, or takes it when negative.
handlers.DebugAddCurrency = function (args)
{
	if (!IsDebugPlayer()) return DebugRefused();

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
	if (!IsDebugPlayer()) return DebugRefused();

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
