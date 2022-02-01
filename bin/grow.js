import {batchReport, netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var start = Date.now();
    var growth = await ns.grow(target, {stock: true});
    await netLog(ns, "grow %s finished, grew by %.2f%%, took %s", target, (growth-1)*100, fmt.time(Date.now()-start));
    await batchReport(ns, target, "grow", growth);
}