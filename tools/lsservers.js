import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    let srvs = ns.getPurchasedServers();
    for (let n=0; n < ns.hacknet.numNodes(); n++) {
        srvs.push(`hacknet-node-${n}`);
    }
    srvs.sort();
    let data = [];
    for (let s of srvs.map(s => [s, s.substr(s.lastIndexOf("-")+1)]).sort((a,b) => a[1]-b[1]).map(s => s[0])) {
        let maxRam = ns.getServerMaxRam(s);
        let usedRam = ns.getServerUsedRam(s);
        let current = !ns.fileExists("/obsolete.txt", s);
        let procs = ns.ps(s)
        data.push([
            s, usedRam, maxRam, usedRam/maxRam, current, summarise(procs),
        ]);
    }
    let pct = (n) => fmt.pct(n, 0, true);
    ns.tprintf(fmt.table(
        data,
        ["HOST", ["USED", fmt.memory], ["TOTAL", fmt.memory], ["%% MEM", pct], ["CURRENT", fmt.bool], "PROCS"],
    ))
}

function summarise(procs) {
    let c = new Map();
    for (let p of procs) {
        let f = p.filename.substring(p.filename.indexOf("/", 1) + 1);
        // await ns.sleep(5);
        if (!c.has(f)) {
            c.set(f, 0);
        }
        c.set(f, c.get(f) + p.threads);
    }

    let res = []
    for (let k of c) {
        res.push(k[0] + ": " + k[1]);
    }
    return res.join(", ");
}