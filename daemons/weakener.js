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

    var script = "/bin/weaken.js";
    var hostname = ns.getHostname();
    var sRam = ns.getScriptRam(script);
    while (true) {
        await ns.sleep(2000+Math.random()*10000);
        if (hostname != "home") {
            await ns.scp("/conf/assignments.txt", "home", hostname);
        }
        var data = ns.read("/conf/assignments.txt");
        if (!data) {
            await netLog(ns, "No assignments found, exiting");
            return;
        }
        var assignments = [];
        data.split("\n").forEach((l) => {
            var bits = l.trim().split("\t");
            if (bits[1].startsWith("<")) {
                return;
            }
            assignments.push(bits[1]);
        })

        var peer = ns.readPort(6);
        if (peer.startsWith("NULL")) {
            peer = "";
        }

        var target = "";
        if (peer) {
            await netLog(ns, "Peer is running %s", peer);
            for (var i = 0; i<assignments.length-1; i++) {
                if (assignments[i] == peer) {
                    target = assignments[i+1]
                }
            }
            if (!target) {
                target = assignments[0];
            }
        } else {
            target = assignments[Math.floor(Math.random()*assignments.length)];
        }
        await ns.tryWritePort(6, target);

        var threads = Math.floor(
            ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname) - reserve)/sRam;
        if (threads == 0) {
            await netLog(ns, "Not enough memory to run with %d reserved", reserve);
            if (reserve == 0) {
                return;
            }
            await ns.sleep(60000);
            continue;
        }

        if (!target) {
            await netLog(ns, "No target , quitting");
            return;
        }
        await netLog(ns, "Weakening %s with %s threads", target, fmt.int(threads));
        var pid = ns.run(script, threads, target);
        if (pid) {
            await ns.sleep(ns.getWeakenTime(target));
            while (ns.scriptRunning(script, hostname)) {
                await ns.sleep(1000);
            }
        }
    }

}

function parseMem(n) {
    var suffix = n[n.length-1];
    n = n.splice(0, n.length-1);
    switch(suffix) {
        case "pb":
            n *= 1000;
        case "tb":
            n *= 1000;
    }
}