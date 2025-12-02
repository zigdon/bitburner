import * as fmt from "/lib/fmt.js";
import {netLog} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";
import {readAssignments} from "/lib/assignments.js";

/** @param {NS} ns **/
export async function main(ns) {
    // Looking through the assigned targets, run weaken on the one with the
    // highest sec
    const ports = getPorts();

    // How much ram to leave unused
    var reserve = ns.args[0];
    if (reserve) {
        reserve = fmt.parseMem(reserve);
    } else {
        reserve = 0;
    }

    var script = "/bin/weaken.js";
    var hostname = ns.getHostname();
    var sRam = ns.getScriptRam(script);
    while (true) {
        if (ns.fileExists("/obsolete.txt")) {
            await netLog(ns, "Server obsolete, shutting down...");
            return;
        }
        await ns.sleep(2000+Math.random()*10000);
        if (hostname != "home") {
            await ns.scp("/conf/assignments.txt", "home", hostname);
        }
        var data = ns.read("/conf/assignments.txt");
        if (!data) {
            await netLog(ns, "No assignments found, exiting");
            return;
        }
        var assignments = readAssignments(ns)  // Read all the targets
            // figure out how much security we can get rid of
            .map(a => a.targets.map(t => [t, ns.getServerSecurityLevel(t)-ns.getServerMinSecurityLevel(t)]))
            .flat(1)  // one entry per target, not per worker
            .sort((a,b) => b[1]-a[1]) // find who needs the most help
            .map(a => a[0]);  // extract the target name

        var peer = ns.readPort(ports.WEAKENERS);
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
        if (!target) {
            await netLog(ns, "No target , quitting");
            return;
        }
        await ns.tryWritePort(ports.WEAKENERS, target);

        var threads = Math.floor(
            ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname) - reserve)/sRam;
        if (threads <= 0) {
            await netLog(ns, "Not enough memory to run with %d reserved", reserve);
            if (reserve == 0) {
                return;
            }
            await ns.sleep(60000);
            continue;
        }

        var start = ns.getServerSecurityLevel(target);
        await netLog(ns, "Weakening %s with %s threads, security: %.2f", target, fmt.int(threads), start);
        var pid = ns.run(script, threads, target);
        if (pid) {
            await ns.sleep(ns.getWeakenTime(target));
            while (ns.scriptRunning(script, hostname)) {
                await ns.sleep(1000);
            }
            await netLog(ns, "Done weakening %s with %s threads, security: %.2f", target, fmt.int(threads), ns.getServerSecurityLevel(target));
        }
    }

}