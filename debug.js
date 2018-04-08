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

	AddVc(userVcBalances, cur, amt);

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