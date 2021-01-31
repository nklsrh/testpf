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

	if (amt > 0)
	{
		AddVc(userVcBalances, cur, amt);
	}
	else
	{
		SubtractVc(userVcBalances, cur, -amt);
	}

	var results = {};
		results.result = true;

	return JSON.stringify(results);
};



handlers.DebugSetCurrency = function(args) 
{
	var GetUserInventoryRequest = 
	{
        "PlayFabId": currentPlayerId
    };
	
    var cur = args.currency;
	var amt = args.amount;
	
    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;

	log.info("cur amt " + cur + " : " + amt);
	log.info("balanc " + userVcBalances[cur]);
	
	var delta = amt - userVcBalances[cur];

	log.info("cur amt " + cur + " : " + amt + " :delta " + delta);
	
	if (delta >= 0)
	{
		AddVc(userVcBalances, cur, delta);
	}
	else
	{
		SubtractVc(userVcBalances, cur, delta);
	}

	var results = {};
		results.result = true;

	return JSON.stringify(results);
};



//TEMPORARY solution until PlayFab's log functions are available from CloudScript
function Log(message, data) {
    server.SetTitleData({
        Key: GetISOTimestamp(),
        Value: message + ' ' + JSON.stringify(data)
    });
}