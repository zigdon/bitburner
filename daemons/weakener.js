import * as fmt from "/lib/fmt.js";
import {netLog} from "/lib/log.js";

/** @param {NS} ns **/
export async function main(ns) {
    // Looking through the assigned targets, run weaken on the one with the
    // highest sec

    // How much ram to leave unused
    var reserve = ns.args[0];
    if (reserve) {
        reserve = parseMem(reserve);
    } else {
        reserve = 0;
    }

    var script = "weaken.js";
    var hostname = ns.getHostname();
    var sRam = ns.getScriptRam(script);
    while (true) {
        if (hostname != "home") {
            await ns.scp("/lib/assignments.txt", "home", hostname);
        }
        var data = ns.read("/lib/assignments.txt");
        if (!data) {
            await netLog(ns, "No assignments found, exiting");
            return;
        }
        var assignments = [];
        data.split("\n").forEach((l) => {
            var bits = l.trim().split("\t");
            assignments.push({worker: bits[0], target: bits[1]});
        })

        var max = 0;
        var target = "";
        assignments.forEach((a) => {
            var sec = ns.getServerSecurityLevel(a.target);
            if (sec > max) {
                target = a.target;
                max = sec;
            }
        })

        var threads = Math.floor(ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname) - reserve)/sRam;
        if (threads == 0) {
            await netLog(ns, "Not enough memory to run with %d reserved", reserve);
            if (reserve == 0) {
                return;
            }
            await ns.sleep(60000);
            continue;
        }

        await netLog(ns, "Weakening %s with %s threads", target, fmt.int(threads));
        var pid = ns.run(script, threads, target);
        if (pid) {
            await ns.sleep(ns.getWeakenTime(target));
            while (ns.scriptRunning(script, hostname)) {
                await ns.sleep(1000);
            }
        }

        await ns.sleep(100);
    }

}

function parseMem(n) {
    var suffix = n[n.length-1];
    n = n.splice(0, n.length-1);
    switch(suffix) {
        case "tb":
            n *= 1000;
    }
}