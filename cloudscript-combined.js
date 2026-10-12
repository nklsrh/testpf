// defining these up top so we can easily change these later if we need to.
var ENERGY_CURRENCY = "EC";					  // currecny code for our Energy VC
var CASH_VC = "CR";					  // currecny code for our Cash VC
var GOLD_VC = "GD";					  // currecny code for our Gold VC



function CheckBalance(vcBalnces, code, amount)
{
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) && vcBalnces[code] >= amount)
	{
		return true;
	}
	else
	{
		return false;
	}
}

function AddVc(vcBalnces, code, qty)
{ 
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) &&  vcBalnces[code] >= 0)
	{
		vcBalnces[code] += qty;
	}

	var AddUserVirtualCurrencyRequest = {
	    "PlayFabId" : currentPlayerId,
	    "VirtualCurrency": code,
	    "Amount": qty
    };
	
	log.debug("Add VC " + code + " : " + qty);

    var AddUserVirtualCurrencyResult = server.AddUserVirtualCurrency(AddUserVirtualCurrencyRequest);
}

function SubtractVc(vcBalnces, code, qty)
{
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) &&  vcBalnces[code] >= qty)
	{
		vcBalnces[code] -= qty;
	}

	var SubtractUserVirtualCurrencyRequest = {
	    "PlayFabId" : currentPlayerId,
	    "VirtualCurrency": code,
	    "Amount": qty
    };

	log.debug("Subtract VC " + code + " : " + qty);

    var SubtractUserVirtualCurrencyResult = server.SubtractUserVirtualCurrency(SubtractUserVirtualCurrencyRequest);
}

handlers.getServerTimestamp = function (args) 
{
    var now = new Date();
    var time = now.getTime(); // miliseconds
    return time;
}

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
		SubtractVc(userVcBalances, cur, Math.abs(delta));
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
		if(!CheckBalance(userVcBalances, ENERGY_CURRENCY, energyUsed))
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
// MULTIPLAYER SHIT

handlers.ChallengePlayer = function (args) {
    var targetId = args.TargetId;
	var groupId = args.GroupId;

	// get current player profile
	var profile = server.GetPlayerProfile({
		PlayFabId : currentPlayerId
	}).PlayerProfile;

	// try to send push notification
	try {
		server.SendPushNotification({
			Recipient : targetId,
			Package : {
				Message : `Your turn with ${profile.DisplayName}: ${groupId}`,
				Title: "${profile.DisplayName} just finished their turn!",
			}
		});
	} catch (ex) {
		// Target player has not registered for Push Notifications
	}
}


handlers.InvitePlayer = function (args) {
    var targetId = args.TargetId;
	var groupId = args.GroupId;

	// get current player profile
	var profile = server.GetPlayerProfile({
		PlayFabId : currentPlayerId
	}).PlayerProfile;
	
	var inviter = profile.DisplayName;

	// try to send push notification
	try {
		server.SendPushNotification({
			Recipient : targetId,
			Package : {
				Message : `Join the match: ${groupId}`,
				Title: "${inviter} wants to play",
				// CustomData: "{'groupID': ${groupId}}",
			}
		});
	} catch (ex) {
		// Target player has not registered for Push Notifications
	}
}
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











// Training challenge boards, kept in Shared Group Data.
//
// A challenge has an id made by the sender's game: <senderPlayFabId>D<drill>K<seed>. Every player who runs it posts their best
// score here, and the board is the group's data: one entry per player, keyed by their PlayFab id. Nobody has to be a PlayFab
// friend of anybody - the id in the link is the only thing that puts a player on a board.
//
// Scores come from the client and are not verified, so the cap below is a sanity limit, not cheat protection.

var CHALLENGE_MAX_ENTRIES = 20;
var CHALLENGE_MAX_SCORE = 5000;

// Parses an id into its sender, drill and seed, or null if it is not one. PlayFab ids are hex, which can contain "D", so the
// drill and seed are read from the end.
function parseChallengeId(id)
{
    if (typeof id !== "string") return null;
    var match = /^([A-F0-9]{8,20})D(\d{1,2})K(\d{1,10})$/.exec(id);
    return match ? { sender: match[1], drill: match[2], seed: match[3] } : null;
}

function challengeGroupId(id)
{
    return "CH" + id;
}

// The board's entries, best first. Player ids stay on the server: a reader only learns which entry is theirs.
function challengeEntries(groupId)
{
    var result = server.GetSharedGroupData({ SharedGroupId: groupId });
    var entries = [];
    for (var playerId in result.Data) {
        try {
            var entry = JSON.parse(result.Data[playerId].Value);
            entries.push({ name: entry.n, score: entry.s, me: playerId === currentPlayerId });
        } catch (e) { /* a damaged entry is skipped, not fatal */ }
    }
    entries.sort(function (a, b) { return b.score - a.score; });
    return entries;
}

function challengeGroupExists(groupId)
{
    try {
        server.GetSharedGroupData({ SharedGroupId: groupId });
        return true;
    } catch (e) {
        return false;
    }
}

handlers.submitChallengeScore = function (args, context) {
    var parsed = parseChallengeId(args.id);
    var score = Math.floor(Number(args.score));
    if (!parsed || !(score >= 0) || score > CHALLENGE_MAX_SCORE) return { ok: false, error: "bad request" };

    var groupId = challengeGroupId(args.id);

    // Only the sender starts a board, so a board cannot be conjured for an id nobody was sent: anyone else can only join one.
    if (!challengeGroupExists(groupId)) {
        if (parsed.sender !== currentPlayerId) return { ok: false, error: "no such challenge" };
        server.CreateSharedGroup({ SharedGroupId: groupId });
    }

    // Names are shown in the game's UI: no markup.
    var name = String(args.name || "Player").replace(/[<>]/g, "").substring(0, 24);

    var entries = challengeEntries(groupId);
    var mine = null;
    for (var i = 0; i < entries.length; i++) if (entries[i].me) mine = entries[i];

    if (!mine && entries.length >= CHALLENGE_MAX_ENTRIES) return { ok: false, error: "full", entries: entries };

    // Only a better score replaces a player's entry.
    if (!mine || score > mine.score) {
        var data = {};
        data[currentPlayerId] = JSON.stringify({ n: name, s: score });
        server.UpdateSharedGroupData({ SharedGroupId: groupId, Data: data });
    }

    return { ok: true, entries: challengeEntries(groupId) };
};

handlers.getChallengeBoard = function (args, context) {
    if (!parseChallengeId(args.id)) return { ok: false, error: "bad request" };

    var groupId = challengeGroupId(args.id);
    if (!challengeGroupExists(groupId)) return { ok: true, entries: [] };

    return { ok: true, entries: challengeEntries(groupId) };
};

