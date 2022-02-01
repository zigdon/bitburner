import * as fmt from "/lib/fmt.js";
import {batchReport, netLog} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var start = Date.now();
    var loot = await ns.hack(target);
    await netLog(ns, "hack %s finished, got %s, took %s", target, fmt.money(loot), fmt.time(Date.now()-start));
    await batchReport(ns, target, "hack", loot);
}