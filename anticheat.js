// ---------------------------------------------------------------------------------------------------------------------
// Currency guard.
//
// The client owns its balances (the device's balance always wins: server setting cur_local_auth) and pushes them here
// through DebugSetCurrency (SCCurrencySync), so this is the one door every currency change - legit or edited - walks
// through. It never trims an increase: trimming here would only make the server's copy disagree with the device, which
// keeps (and spends) its own balance regardless. Instead it flags the player when increases run past what the days
// since their last sync could earn, so a device that was offline for a week can bring a week's earnings in one push.
//
// Gold bought with real money also arrives here (the client adds it locally after the store purchase), so validated spend
// raises the gold and cash budgets. iOS receipts are not validated yet, which is why the hard caps leave room for an
// unvalidated purchase or two: past the soft cap a player is only flagged, not clamped.
// Tune these against real players before tightening them.
var GD_DAILY_SOFT = 400;          // free gold a day: star challenges (20-75 each) + daily reward (10/50)
var GD_DAILY_HARD = 2000;         // above this, without validated spend, the player is flagged as over the hard cap
var CR_DAILY_SOFT = 60000;
var CR_DAILY_HARD = 250000;
var GD_PER_PAID_CENT = 0.65;      // best gold bundle is 600 for 999c; rounded up
var CR_PER_PAID_CENT = 10;        // that gold converted at 15 CR each
var EC_MAX_BALANCE = 20;          // fallback when PlayFab reports no recharge max for event energy
var GD_ABSURD = 20000;            // a balance no non-payer can reach: flag on sight
var CR_ABSURD = 5000000;
var MAX_OFFLINE_DAYS = 14;        // the most days of earnings one sync is allowed to carry before it's flagged
var GUARDED_CURRENCIES = { "CR": true, "GD": true, "EC": true, "MR": true };

var SUSPECT_STAT = "Suspect";     // server-written flag the client filters public boards on
var LEDGER_KEY = "acLedger_";     // + currency. Internal data: the client can neither read nor write it. One key per
                                  // currency because the client pushes CR and GD in parallel executions.
var FLAG_KEY = "acFlag";
var MATCHES_KEY = "acServerEventMatches";
var SERVER_MATCHES_STAT = "ServerEventMatches";

function readInternal(key)
{
	var data = server.GetUserInternalData({ PlayFabId: currentPlayerId, Keys: [key] }).Data;
	if (!data || !data[key]) return null;
	try { return JSON.parse(data[key].Value); } catch (e) { return null; }
}

function writeInternal(key, value)
{
	var data = {};
	data[key] = JSON.stringify(value);
	server.UpdateUserInternalData({ PlayFabId: currentPlayerId, Data: data });
}

// Validated real-money spend, in US cents. Only receipts PlayFab checked count (Google Play today).
function paidCents()
{
	var profile = server.GetPlayerProfile({
		PlayFabId: currentPlayerId,
		ProfileConstraints: { ShowTotalValueToDateInUsd: true }
	}).PlayerProfile;
	return (profile && profile.TotalValueToDateInUSD) || 0;
}

// Records why a player looks wrong and raises the public-board flag. Never blocks anything by itself.
function flagSuspect(reason, detail)
{
	var flag = readInternal(FLAG_KEY) || { reasons: {}, first: new Date().toISOString(), count: 0 };
	var alreadyFlagged = flag.count > 0;
	flag.reasons[reason] = detail;
	flag.last = new Date().toISOString();
	flag.count += 1;
	writeInternal(FLAG_KEY, flag);

	// A flagged player keeps pushing, so this runs repeatedly; the board flag only needs raising once.
	if (alreadyFlagged) return;

	server.UpdatePlayerStatistics({
		PlayFabId: currentPlayerId,
		Statistics: [{ StatisticName: SUSPECT_STAT, Value: 1 }]
	});
	log.info("suspect " + reason + " " + JSON.stringify(detail));
}

// Records an increase against the player's allowance and flags them past it. Never trims: the whole increase is
// granted (see the top of this file). The allowance is per day, times the days since this currency last synced, so a
// device that was offline brings its offline days' earnings without being flagged.
function budgetIncrease(cur, delta, paid)
{
	var key = LEDGER_KEY + cur;
	var ledger = readInternal(key) || { day: 0, used: 0, paidSeen: 0, span: 1 };
	var today = Math.floor(Date.now() / 86400000); // days since 1970, so days between syncs is a subtraction
	if (ledger.day !== today)
	{
		// The first sync of a day covers every day since the last one (a ledger from before this change stored
		// the day as yyyymmdd, which reads as far in the past: the full span, once).
		ledger.span = ledger.day > 0 ? Math.min(MAX_OFFLINE_DAYS, Math.max(1, today - ledger.day)) : 1;
		ledger.day = today;
		ledger.used = 0;
	}
	var span = ledger.span || 1;

	var newPaid = Math.max(0, paid - ledger.paidSeen);
	var soft = (cur === GOLD_VC ? GD_DAILY_SOFT : CR_DAILY_SOFT) * span;
	var hard = (cur === GOLD_VC ? GD_DAILY_HARD : CR_DAILY_HARD) * span;
	var paidBonus = Math.ceil(newPaid * (cur === GOLD_VC ? GD_PER_PAID_CENT : CR_PER_PAID_CENT));

	ledger.used += delta;
	if (newPaid > 0) ledger.paidSeen = paid;
	writeInternal(key, ledger);

	if (ledger.used > hard + paidBonus)
	{
		flagSuspect(cur + "_over_hard_cap", { asked: delta, window: ledger.used, days: span, paidCents: paid });
	}
	else if (ledger.used > soft && newPaid === 0)
	{
		flagSuspect(cur + "_over_soft_cap", { window: ledger.used, days: span, paidCents: paid });
	}

	return delta;
}

// True when a balance is beyond anything free play plus validated spend could buy.
function isAbsurdBalance(cur, balance, paid)
{
	if (cur === GOLD_VC) return balance > GD_ABSURD + paid * GD_PER_PAID_CENT;
	if (cur === CASH_VC) return balance > CR_ABSURD + paid * CR_PER_PAID_CENT;
	return false;
}

// Run per player from a Scheduled Task over a segment (e.g. "All Players" or "Active last 7 days") to flag balances that
// were edited in before the guard went live. Flags only; rolling balances back is a separate, deliberate step.
handlers.AuditCurrency = function(args)
{
	var balances = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency || {};
	var gd = balances[GOLD_VC] || 0;
	var cr = balances[CASH_VC] || 0;
	if (gd <= GD_ABSURD && cr <= CR_ABSURD) return { flagged: false };

	var paid = paidCents();
	if (!isAbsurdBalance(GOLD_VC, gd, paid) && !isAbsurdBalance(CASH_VC, cr, paid)) return { flagged: false };

	flagSuspect("audit_absurd_balance", { gd: gd, cr: cr, paidCents: paid });
	return { flagged: true };
};
