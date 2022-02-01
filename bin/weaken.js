import {log, batchReport, netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var start = Date.now();
    log(ns, "Starting weaken on %s", target);
    var weakened = await ns.weaken(target);
    await netLog(ns, "weaken %s finished, weakened by %.2f, took %s", target, weakened, fmt.time(Date.now()-start));
    await batchReport(ns, target, "weaken", weakened);
}