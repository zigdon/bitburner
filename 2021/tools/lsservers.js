import * as fmt from "/lib/fmt.js";
import {settings} from "/lib/state.js";
import {hosts, sorter} from "/lib/hosts.js";
import {resizeWindow} from "/lib/ui.js";

let st;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    st = settings(ns, "lsservers");
    let flags = ns.flags([
        ["top", false],
    ])
    let out = ns.tprintf;
    if (flags.top) {
        out = ns.printf;
        ns.tail();
        resizeWindow("lsservers");
    }
    while (true) {
        if (flags.top) {
            ns.tail();
            resizeWindow("lsservers", {h:null});
            ns.clearLog();
        }
        let srvs = [];
        if (st.read("useHomeBee") > 0) {
            srvs.push("home");
        }
        srvs.push(...ns.getPurchasedServers());
        if (st.read("useHacknetBees")) {
            for (let n=0; n < ns.hacknet.numNodes(); n++) {
                srvs.push(`hacknet-node-${n}`);
            }
        }
        if (st.read("useWildBees")) {
            srvs.push(...hosts(ns).filter(
                h => !h.purchased && h.root && h.host != "home" && !h.host.startsWith("hacknet-node-")
            ).map(h => h.host));
        }

        srvs.sort(sorter);
        let data = [];
        let wild = {};
        for (let f of ["used", "max", "grow", "hack", "weaken", "other"]) {
            wild[f] = 0;
        }
        for (let s of srvs) {
            let maxRam = ns.getServerMaxRam(s);
            let usedRam = ns.getServerUsedRam(s);
            let current = !ns.fileExists("/obsolete.txt", s);
            let procs = ns.ps(s)
            if (s.startsWith("pserv-") || s.startsWith("hacknet-node-") || s == "home") {
                data.push([
                    s, usedRam, maxRam, usedRam/maxRam, current, ...summarise(procs),
                ]);
            } else {
                let summary = summarise(procs);
                wild["used"] += usedRam;
                wild["max"] += maxRam;
                wild["grow"] += summary[0];
                wild["hack"] += summary[1];
                wild["weaken"] += summary[2];
                wild["other"] += summary[3];
            }
        }
        if (wild) {
            data.push([
                "wild servers", wild["used"], wild["max"], wild["used"]/wild["max"], "N/A",
                wild["grow"], wild["hack"], wild["weaken"], wild["other"],
            ]);
        }
        out("%s", fmt.table(
            data,
            ["HOST", ["USED", fmt.memory], ["TOTAL", fmt.memory], ["% MEM", fmt.pct],
            ["CURRENT", fmt.bool], "Grow", "Hack", "Weaken", "other"],
        ));
        if (!flags.top) {
            break;
        }
        await ns.sleep(500);
    }
}

function summarise(procs) {
    let c = {"grow": 0, "hack": 0, "weaken": 0, "other": 0};
    for (let p of procs) {
        let f = p.filename.replace(/.bin\//, "").split(".")[0];
        if (c[f] !== undefined) {
            c[f]+=p.threads;
        } else {
            c["other"] += p.threads;
        }
    }

    return [c["grow"], c["hack"], c["weaken"], c["other"]];
}