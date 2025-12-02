import * as fmt from "/lib/fmt.js"
import { console, log } from "/lib/log.js"
import { hosts } from "/lib/hosts.js"
import { readAssignments } from "/lib/assignments.js"
/** @param {NS} ns **/
export async function main(ns) {
    var script = "/daemons/batch.js"
    var total = ns.args[0] || 1;
    var res = ns.args[1] || 0;
    var cur = ns.ps().filter((p) => { return p.filename == script });
    if (cur.length >= total) {
        cur.sort((a,b) => a.pid - b.pid);
        await console(ns, "already running %d batches, killing oldest (%s).", total, cur[0].args[0])
        ns.kill(cur[0].pid);
    }
    if (res == 0) {
        [
            "assigntargets.js", "install.js", "scan.js", "search-and-hack.js", "docrime.js",
        ].forEach((p) => { res += ns.getScriptRam("/tools/" + p) });
        [
            "batch.js", "buyer.js", "controller.js", "cron.js", "logger.js", "monitor.js", "sleevemgr.js", "ui.js",
        ].forEach((p) => { res += ns.getScriptRam("/daemons/" + p) });
    }
    if (ns.getServerMaxRam("home") - res < 50) {
        await console(ns, "Not really enough memory to batch, was trying to reserve %s.", fmt.memory(res));
        return;
    }
    res = ns.getServerMaxRam("home") - res;
    await console(ns, "reserving %s per instance", fmt.memory(res))

    var hs = hosts(ns).filter(h => h.root);
    var as = readAssignments(ns)
    var assigned = (h) => !as.every(a => a.target != h.host );
    hs.sort((a, b) => { return b.max - a.max })
    hs = hs.filter((h) => { return h.max > 0 && !assigned(h) })
    if (hs.length == 0) {
        await console(ns, "no unassigned targets");
        return
    } else if (hs.length < total-1) {
        await console(ns, "only %d unassigned targets");
        return
    }
    log(ns, "Unassigned targets: %s", hs.map(h => h.host).join(", "));
    for (var count=0; count < total; count++) {
        await console(ns, "launching home batch targetting %s", hs[count].host)
        if (!ns.exec(script, "home", 1, hs[count].host, res, "--single")) {
            await console(ns, "Failed to launch!");
            return;
        }
    }
}