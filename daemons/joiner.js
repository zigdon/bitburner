import {toast} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    var rejected = [];
    while (true) {
        var invs = ns.checkFactionInvitations();
        for (var i of invs) {
            if (rejected.indexOf(i) >= 0) {
                continue;
            }
            var owned = ns.getOwnedAugmentations(true);
            var missing = ns.getAugmentationsFromFaction(i).filter(a => owned.indexOf(a) == -1);
            if (missing.length > 0) {
                await toast(ns, "Accepting new invitation from %s, %d augs missing",
                 i, missing.length, {level: "success", timeout: 0});
                if (!ns.joinFaction(i)) {
                    await toast(ns, "Failed to join %s for some reasons!", i, {level: "error", timeout: 0});
                }
            } else {
                await toast(ns, "Rejecting new invitation from %s", i, {level: "info"});
                rejected.push(i)
            }
        }
        await ns.sleep(30000);
    }
}