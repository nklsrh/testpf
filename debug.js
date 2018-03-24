handlers.DebugAddCurrency = function(args) 
{
	var GetUserInventoryRequest = 
	{
        "PlayFabId": currentPlayerId
    };
	
    var cur = args.currency;
	var amt = args.amount;

	log.info("cur amt " + cur + " : " + amt);
	
    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;

	AddVc(cur, ENERGY_CURRENCY, amt);

	var results = {};
		results.result = true;

	return JSON.stringify(results);
};