import * as fmt from "/lib/fmt.js";
/** @param {NS} ns **/
export async function main(ns) {
    var srvs = ns.getPurchasedServers();
    srvs.sort();
    for (var s of srvs.sort((a,b) => { return b.substring(b.indexOf("-")) - a.substring(a.indexOf("-")) })) {
        var maxRam = ns.getServerMaxRam(s);
        var usedRam = ns.getServerUsedRam(s);
        var procs = ns.ps(s)
        ns.tprintf("%8s: %6s/%6s GB, %s", s, fmt.int(usedRam), fmt.int(maxRam), await summarise(ns, procs));
    }
}

async function summarise(ns, procs) {
    var c = new Map();
    for (var p of procs) {
        var f = p.filename.substring(p.filename.indexOf("/", 1)+1);
        await ns.sleep(5);
        if (!c.has(f)) {
            c.set(f, 0);
        }
        c.set(f, c.get(f)+p.threads);
    }

    var res = []
    for (var k of c) {
        res.push(k[0] + ": " + k[1]);
    }
    return res.join(", ");
}