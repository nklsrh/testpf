handlers.PlayMatchEnergy = function(args) {
	// get the calling player's inventory and VC balances
	var GetUserInventoryRequest = {
        "PlayFabId": currentPlayerId
    };

	var energyUsed = args.energy;

    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	var userVcRecharge = GetUserInventoryResult.VirtualCurrencyRechargeTimes;

	// make sure the player has > 0 Energy before proceeding. 
	try
	{
		if(CheckBalance(userVcBalances, ENERGY_CURRENCY) < energyUsed)
		{
			var energycur = vcBalnces[code];
			throw energycur + " Energy remaining. Purchase additional Energy or wait: " + userVcRecharge[ENERGY_CURRENCY].SecondsToRecharge + " seconds.";
		}
	}
	catch(ex)
	{
		return JSON.stringify(ex);
	}
	

	log.debug("PlaymatchEnergy " + ENERGY_CURRENCY + " : " + energyUsed);

	var energyLost = energyUsed;
	SubtractVc(userVcBalances, ENERGY_CURRENCY, energyLost);
	
	var results = {};
		results.energyLost = energyLost;

	return JSON.stringify(results);
};