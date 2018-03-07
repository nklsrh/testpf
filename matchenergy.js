handlers.PlayMatchEnergy = function(args) {
	// get the calling player's inventory and VC balances
	var GetUserInventoryRequest = {
        "PlayFabId": currentPlayerId
    };

     var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userInventory = GetUserInventoryResult.Inventory;
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	var userVcRecharge = GetUserInventoryResult.VirtualCurrencyRechargeTimes;

	// make sure the player has > 0 Energy before proceeding. 
	try
	{
		if(!CheckBalance(userVcBalances, ENERGY_CURRENCY))
		{
			throw "No Energy remaining. Purchase additional Energy or wait: " + userVcRecharge[ENERGY_CURRENCY].SecondsToRecharge + " seconds.";
		}
	}
	catch(ex)
	{
		return JSON.stringify(ex);
	}
	
	var energyLost = 1;
	SubtractVc(userVcBalances, ENERGY_CURRENCY, energyLost);
	
	var results = {};
		results.energyLost = energyLost;

	return JSON.stringify(results);
};