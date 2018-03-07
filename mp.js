

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