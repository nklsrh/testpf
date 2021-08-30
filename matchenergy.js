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
		if(CheckBalance(userVcBalances, ENERGY_CURRENCY, energyUsed))
		{
			var results = {};
				results.energyLost = 0;
				results.error = 1;
			
			var energycur = vcBalnces[ENERGY_CURRENCY];
			var error = energycur + " Energy remaining. Purchase additional Energy or wait: " + userVcRecharge[ENERGY_CURRENCY].SecondsToRecharge + " seconds.";
			log.debug(error);

			return JSON.stringify(results);
		}
	}
	catch(ex)
	{
		var results = {};
			results.energyLost = 0;
			results.error = 1;
			
		return JSON.stringify(ex);
	}
	

	log.debug("PlaymatchEnergy " + ENERGY_CURRENCY + " : " + energyUsed);

	var energyLost = energyUsed;
	SubtractVc(userVcBalances, ENERGY_CURRENCY, energyLost);
	
	var results = {};
		results.energyLost = energyLost;

	return JSON.stringify(results);
};