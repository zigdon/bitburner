import * as fmt from "/lib/fmt.js";

var fullUpgrade = 268859712;
var fullRate = 642.5956059489174; 

/** @param {NS} ns **/
export async function main(ns) {
    var limit = fmt.parseTime(ns.args[0]);
    for (var n=0; n<ns.hacknet.numNodes(); n++) {
        var stats = ns.hacknet.getNodeStats(n);
        if (stats.level == 200 && stats.cores == 16 && stats.ram == 64) {
            // fully upgraded
            continue;
        }
        upgrade(ns, n);
        return;
    }

    while (true) {
        var cost = ns.hacknet.getPurchaseNodeCost() + fullUpgrade;
        if (cost > ns.getServerMoneyAvailable("home")) {
            ns.tprintf("Can't afford next server at %s.", fmt.money(cost));
            return;
        }
        if (limit > 0) {
            if (cost/fullRate > limit) {
                return;
            }
            ns.tprintf("Buying for %s, %s to recoup", fmt.money(cost), fmt.time(cost/fullRate));
        } else {
            if (!await ns.prompt(sprintf("Buy fully upgraded node for %s (%s base)? %s to recoup",
                fmt.money(cost),
                fmt.money(ns.hacknet.getPurchaseNodeCost()),
                fmt.time(cost/fullRate)))) {
                ns.tprint("Aborting!");
                return;
            }
        }
        var n = ns.hacknet.purchaseNode();
        ns.hacknet.upgradeLevel(n, 199);
        ns.hacknet.upgradeCore(n, 15);
        ns.hacknet.upgradeRam(n, 6);
        ns.print(ns.hacknet.getNodeStats(n));
        if (limit > 0) {
            continue;
        }
        break;
    }
}

/**
 * @param {NS} ns
 * @param {Number} n
 */
function upgrade(ns, n) {
    var stats = ns.hacknet.getNodeStats(n);
    var cost = 0;
    cost += ns.hacknet.getRamUpgradeCost(n, 6-Math.log2(stats.ram));
    cost += ns.hacknet.getCoreUpgradeCost(n, 16 - stats.cores);
    cost += ns.hacknet.getLevelUpgradeCost(n,200 - stats.level);
    ns.tprintf("Upgrade cost: %s (%s to recoup)", fmt.money(cost), fmt.time(cost/fullRate));
    ns.hacknet.upgradeLevel(n, 200 - stats.level);
    ns.hacknet.upgradeCore(n, 16 - stats.cores);
    ns.hacknet.upgradeRam(n, 6-Math.log2(stats.ram));
}