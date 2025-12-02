var commaFmt = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 2});

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("getServerSecurityLevel");
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("sleep");
	var target = ns.args[0];
	var secTarget = ns.getServerMinSecurityLevel(target) + 5;
	var monTarget = ns.getServerMaxMoney(target) * 0.75;
	var host = ns.getHostname();

	while(true) {
		var curSec = ns.getServerSecurityLevel(target);
		var curMon = ns.getServerMoneyAvailable(target);
		var msg = ns.sprintf("%s: sec: %.2f(%d)  $%s($%s)",
		 host, curSec, secTarget, commaFmt.format(curMon), commaFmt.format(monTarget));
		ns.print(msg);
		if (curSec > secTarget) {
			await ns.weaken(target);
		} else if (curMon < monTarget) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
		await ns.sleep(1000);
	}
}