// Spends the energy a match costs. The game reads `energyLost` from the JSON string this returns; `error` is 1 when the player did
// not have enough, in which case nothing is taken.
handlers.PlayMatchEnergy = function (args)
{
	var energyUsed = args.energy;

	var inventory = GetInventory();
	var balances = inventory.VirtualCurrency;

	if (!CheckBalance(balances, ENERGY_CURRENCY, energyUsed))
	{
		var recharge = inventory.VirtualCurrencyRechargeTimes ? inventory.VirtualCurrencyRechargeTimes[ENERGY_CURRENCY] : null;
		log.debug((balances[ENERGY_CURRENCY] || 0) + " energy remaining; next in " + (recharge ? recharge.SecondsToRecharge : "?") + " seconds.");

		return JSON.stringify({ energyLost: 0, error: 1 });
	}

	log.debug("PlayMatchEnergy " + ENERGY_CURRENCY + " : " + energyUsed);
	SubtractVc(balances, ENERGY_CURRENCY, energyUsed);

	return JSON.stringify({ energyLost: energyUsed });
};
