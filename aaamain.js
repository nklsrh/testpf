// defining these up top so we can easily change these later if we need to.
var ENERGY_CURRENCY = "SC";					  // currecny code for our Energy VC
var CASH_VC = "CR";					  // currecny code for our Cash VC
var GOLD_VC = "GD";					  // currecny code for our Gold VC



function CheckBalance(vcBalnces, code)
{
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) && vcBalnces[code] > 0)
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
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) &&  vcBalnces[code] > 0)
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
