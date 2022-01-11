/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint(eval(ns.args.join(";")))
	ns.getPurchasedServerMaxRam();
    ns.getServerMoneyAvailable("home");
    ns.getPurchasedServerCost(2);
    ns.growthAnalyze("home", 1);
}