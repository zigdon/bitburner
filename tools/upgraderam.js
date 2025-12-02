import * as fmt from "/lib/fmt.js";
/** @param {NS} ns **/
export async function main(ns) {
    var i =0;
    while (ns.upgradeHomeRam()) {
        i++;
    }

    ns.tprintf("Upgraded ram %d times to %s, next upgrade is %s",
        i, fmt.memory(ns.getServerMaxRam("home")), fmt.money(ns.getUpgradeHomeRamCost()));
}