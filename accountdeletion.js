// In-app account deletion (Google Play's account deletion requirement).
//
// The client calls this after the player has confirmed twice (Menu_Popup_Settings). It removes the calling player from this
// title along with everything stored for them here: user data (the save, its backups and archives), statistics, inventory
// and virtual currency. PlayFab deletes asynchronously, so the client wipes its local copy without waiting for that to finish.

handlers.DeleteMyAccount = function (args) {
    server.DeletePlayer({ PlayFabId: currentPlayerId });
    return { deleted: true };
};
