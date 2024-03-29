handlers.BuyPlayerContract = function(args) {
	// get the calling player's inventory and VC balances
	var GetUserInventoryRequest = {
        "PlayFabId": currentPlayerId
    };

    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userInventory = GetUserInventoryResult.Inventory;
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	
	var cost = args.matches * 100;

	// make sure the player has > 0 CASH_VC before proceeding. 
	try
	{
		if(!CheckBalance(userVcBalances, CASH_VC, cost))
		{
			throw "No CASH_VC remaining. Purchase additional CASH_VC";
		}
	}
	catch(ex)
	{
		return JSON.stringify(ex);
	}
	
	SubtractVc(userVcBalances, CASH_VC, cost);
	
	var results = {};
		results.amountCost = cost;
		results.currency = CASH_VC;

	return JSON.stringify(results);
};










