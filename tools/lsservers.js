import * as fmt from "/lib/fmt.js";
/** @param {NS} ns **/
export async function main(ns) {
    var srvs = ns.getPurchasedServers();
    srvs.sort();
    var data = [];
    for (var s of srvs.sort((a, b) => { return b.substring(b.indexOf("-")) - a.substring(a.indexOf("-")) })) {
        var maxRam = ns.getServerMaxRam(s);
        var usedRam = ns.getServerUsedRam(s);
        var current = ns.fileExists("/obsolete.txt", s) ? "x" : "✓";
        var procs = ns.ps(s)
        data.push([
            s, usedRam, maxRam, current, summarise(procs),
        ]);
        /*
        ns.tprintf("%8s: %6s/%6s, %s%s",
            s, fmt.memory(usedRam),
            fmt.memory(maxRam), 
            obs, 
            await summarise(ns, procs));
            */
    }
    ns.tprintf(fmt.table(
        data,
        ["HOST", "USED", "TOTAL", "CURRENT", "PROCS"],
        [null, fmt.memory, fmt.memory],
    ))
}

function summarise(procs) {
    var c = new Map();
    for (var p of procs) {
        var f = p.filename.substring(p.filename.indexOf("/", 1) + 1);
        // await ns.sleep(5);
        if (!c.has(f)) {
            c.set(f, 0);
        }
        c.set(f, c.get(f) + p.threads);
    }

    var res = []
    for (var k of c) {
        res.push(k[0] + ": " + k[1]);
    }
    return res.join(", ");
}