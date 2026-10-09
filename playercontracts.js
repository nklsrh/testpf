// Buys a player contract for `args.matches` matches, at 100 cash each. Returns the JSON string { amountCost, currency }, or a JSON
// string holding the reason when the player cannot afford it.
var CONTRACT_COST_PER_MATCH = 100;

handlers.BuyPlayerContract = function (args)
{
	var balances = GetInventory().VirtualCurrency;
	var cost = args.matches * CONTRACT_COST_PER_MATCH;

	if (!CheckBalance(balances, CASH_VC, cost))
	{
		return JSON.stringify("Not enough " + CASH_VC + " for this contract.");
	}

	SubtractVc(balances, CASH_VC, cost);

	return JSON.stringify({ amountCost: cost, currency: CASH_VC });
};
