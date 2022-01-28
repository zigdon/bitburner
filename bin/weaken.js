import {batchReport, netLog} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var weakened = await ns.weaken(target);
    await netLog(ns, "weaken %s finished, weakened by %.2f", target, weakened);
    await batchReport(ns, target, "weaken", weakened);
}