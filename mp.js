// Turn-based multiplayer pushes. The game does not call these at the moment.

// Sends `message` to `targetId` as a push notification. A player who has not registered for pushes is skipped.
function SendPush(targetId, title, message)
{
	try
	{
		server.SendPushNotification({
			Recipient: targetId,
			Package: { Title: title, Message: message }
		});
	}
	catch (ex)
	{
		// The target has not registered for push notifications.
	}
}

function CurrentDisplayName()
{
	return server.GetPlayerProfile({ PlayFabId: currentPlayerId }).PlayerProfile.DisplayName;
}

// Tells `args.TargetId` that it is their turn in match `args.GroupId`.
handlers.ChallengePlayer = function (args)
{
	var name = CurrentDisplayName();
	SendPush(args.TargetId, name + " just finished their turn!", "Your turn with " + name + ": " + args.GroupId);
};

// Invites `args.TargetId` to match `args.GroupId`.
handlers.InvitePlayer = function (args)
{
	var name = CurrentDisplayName();
	SendPush(args.TargetId, name + " wants to play", "Join the match: " + args.GroupId);
};
