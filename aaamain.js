// Shared helpers. PlayFab joins every file in this repo into one CloudScript revision, and this one is named to sort first so the
// rest can use what is defined here. CloudScript is ES5: no let/const, arrow functions or template strings.

// Virtual currency codes.
var ENERGY_CURRENCY = "EC";
var CASH_VC = "CR";

// ---- Virtual currency --------------------------------------------------------------------------------------------

// The calling player's inventory: { VirtualCurrency, VirtualCurrencyRechargeTimes, Inventory }.
function GetInventory()
{
	return server.GetUserInventory({ PlayFabId: currentPlayerId });
}

// Whether the balances hold at least `amount` of `code`.
function CheckBalance(vcBalances, code, amount)
{
	return vcBalances != null && vcBalances.hasOwnProperty(code) && vcBalances[code] >= amount;
}

// Adds to the player's balance on the server, and to the local copy of it so a later check in the same call sees it.
function AddVc(vcBalances, code, qty)
{
	log.debug("Add VC " + code + " : " + qty);
	server.AddUserVirtualCurrency({ PlayFabId: currentPlayerId, VirtualCurrency: code, Amount: qty });

	if (vcBalances != null && vcBalances.hasOwnProperty(code))
	{
		vcBalances[code] += qty;
	}
}

// Takes from the player's balance. The server refuses a balance that would go below zero, and that error is not caught here.
function SubtractVc(vcBalances, code, qty)
{
	log.debug("Subtract VC " + code + " : " + qty);
	server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, VirtualCurrency: code, Amount: qty });

	if (vcBalances != null && vcBalances.hasOwnProperty(code))
	{
		vcBalances[code] -= qty;
	}
}

// ---- Handlers ----------------------------------------------------------------------------------------------------

// The server's clock in milliseconds, so the game does not trust the device's.
handlers.getServerTimestamp = function (args)
{
	return new Date().getTime();
};
