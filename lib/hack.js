import {batchReport, netLog} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function execCmd(ns, f, target, name, eta, delta) {
    var start = Date.now();
    var res = await f(target);
    var now = Date.now();
    var elapsed = now-start;
    if (eta && Math.abs(eta-now > 250)) {
        await netLog(ns, "bad %s estimate for %s: off by %s",
            name, target, fmt.time(Math.abs(eta-elapsed), {digits: 2})
        );
    }
    if (delta && Math.abs(delta-elapsed > 250)) {
        await netLog(ns, "bad %s delta for %s: wanted %s, took %s (%s)",
            name, target, fmt.time(delta), fmt.time(elapsed), fmt.time(Math.abs(delta-elapsed), {digits: 2})
        );
    }
    await netLog(ns, "%s %s finished, by %s, took %s", target, name, res, fmt.time(Date.now()-start));
    await batchReport(ns, target, name, res);
}