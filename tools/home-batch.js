import * as fmt from "/lib/fmt.js"
import { console } from "/lib/log.js"
import { hosts } from "/lib/hosts.js"
import { readAssignments } from "/lib/assignments.js"
/** @param {NS} ns **/
export async function main(ns) {
    var script = "/daemons/batch.js"
    var count = ns.args[0] || 1
    if (ns.ps().filter((p) => { return p.filename == script }).length >= count) {
        await console(ns, "already running %d batches.", count)
        return
    }
    var res = 0;
    ["assigntargets.js", "buyprogs.js", "contracts.js",
    "install.js", "scan.js", "search-and-hack.js"
    ].forEach((p) => { res += ns.getScriptRam("/tools/" + p) });
    ["batch.js", "buyer.js", "controller.js", "cron.js",
    "logger.js", "monitor.js"
    ].forEach((p) => { res += ns.getScriptRam("/daemons/" + p) });
    await console(ns, "reserving %s RAM", fmt.int(res))

    var hs = hosts(ns)
    var as = readAssignments(ns)
    var assigned = function (h) { return as.filter((a) => { return a.target == h }).length > 0 }
    hs.sort((a, b) => { return b.max - a.max })
    hs = hs.filter((h) => { return h.max > 0 && !assigned(h) })
    if (hs.length == 0) {
        await console(ns, "no unassigned targets")
        return
    }
    await console(ns, "launching home batch targetting %s", hs[0].host)
    ns.exec(script, "home", 1, hs[0].host, res)
}