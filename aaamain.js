// defining these up top so we can easily change these later if we need to.
var ENERGY_CURRENCY = "MR";					  // currecny code for our Energy VC
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
    var AddUserVirtualCurrencyResult = server.AddUserVirtualCurrency(AddUserVirtualCurrencyRequest);
}

function SubtractVc(vcBalnces, code, qty)
{
	if(vcBalnces != null && vcBalnces.hasOwnProperty(code) &&  vcBalnces[code] > 0)
	{
		vcBalnces[code] -= qty;
	}

	var SubtractUserVirtualCurrencyRequest = {
	    "PlayFabId" : currentPlayerId,
	    "VirtualCurrency": code,
	    "Amount": qty
    };

    var SubtractUserVirtualCurrencyResult = server.SubtractUserVirtualCurrency(SubtractUserVirtualCurrencyRequest);
}

function getServerTimestamp() {// miliseconds
    var now = new Date();
    var time = now.getTime(); // miliseconds
    return time;
}