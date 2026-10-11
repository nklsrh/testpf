handlers.PlayMatchEnergy = function(args) {
	// get the calling player's inventory and VC balances
	var GetUserInventoryRequest = {
        "PlayFabId": currentPlayerId
    };

	var energyUsed = Math.floor(Number(args.energy));

	if (!(energyUsed > 0))
	{
		var results = {};
			results.energyLost = 0;
		return JSON.stringify(results);
	}

    var GetUserInventoryResult = server.GetUserInventory(GetUserInventoryRequest);
	var userVcBalances = GetUserInventoryResult.VirtualCurrency;
	var userVcRecharge = GetUserInventoryResult.VirtualCurrencyRechargeTimes;

	// make sure the player has > 0 Energy before proceeding.
	try
	{
		if(!CheckBalance(userVcBalances, ENERGY_CURRENCY, energyUsed))
		{
			var results = {};
				results.energyLost = 0;
				results.error = 1;

			var energycur = userVcBalances[ENERGY_CURRENCY];
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

		return JSON.stringify(results);
	}


	log.debug("PlaymatchEnergy " + ENERGY_CURRENCY + " : " + energyUsed);

	var energyLost = energyUsed;
	SubtractVc(userVcBalances, ENERGY_CURRENCY, energyLost);

	// A match start the server saw and charged for. Only Quickmatches and Slogfest call this, so it counts event matches,
	// not World Tour or Weekly Innings - still a floor detection can trust, unlike the client-posted MatchesPlayed.
	var matches = (readInternal(MATCHES_KEY) || 0) + 1;
	writeInternal(MATCHES_KEY, matches);
	server.UpdatePlayerStatistics({
		PlayFabId: currentPlayerId,
		Statistics: [{ StatisticName: SERVER_MATCHES_STAT, Value: matches }]
	});

	var results = {};
		results.energyLost = energyLost;

	return JSON.stringify(results);
};