/** @param {NS} ns **/
export async function main(ns) {
    var n = ns.hacknet.purchaseNode();
    ns.hacknet.upgradeLevel(n, 199);
    ns.hacknet.upgradeCore(n, 15);
    ns.hacknet.upgradeRam(n, 6);
}