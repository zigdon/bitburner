import * as fmt from "/lib/fmt.js";
import {netLog} from "/lib/log.js";
import {getPorts} from "/lib/ports.js";
import {readAssignments} from "/lib/assignments.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    // Looking through the assigned targets, run weaken on the one with the
    // highest sec. Failing that, run grow on the lower valued ones
    const ports = getPorts();

    // How much ram to leave unused
    var reserve = ns.args[0];
    if (reserve) {
        reserve = fmt.parseMem(reserve);
    } else if (ns.getCurrentServer() == "home") {
        reserve = 100;
    } else {
        reserve = 0;
    }

    var wScript = "/bin/weaken.js";
    var gScript = "/bin/grow.js";
    var hostname = ns.getHostname();
    var wRam = ns.getScriptRam(wScript);
    var gRam = ns.getScriptRam(wScript);
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

        var mode = "weaken";
        // Read all the targets
        var assignments = readAssignments(ns)
            // figure out how much security we can get rid of
            .map(a => a.targets.map(t => [t, ns.getServerSecurityLevel(t)-ns.getServerMinSecurityLevel(t)]))
            // one entry per target, not per worker
            .flat(1)
            // find who needs the most help
            .sort((a,b) => b[1]-a[1])
            // only engage ones that are not almost there
            .filter(a => a[1] > 5)
            // extract the target name
            .map(a => a[0]);

        // If no one needs help weakening, help grow/prewarm
        if (assignments.length ==0 ) {
            mode = "grow";
            // Read all the targets
            assignments = readAssignments(ns)
            // figure out how much security we can get rid of
            .map(a => a.targets.map(t => [t, ns.getServerMoneyAvailable(t)/ns.getServerMaxMoney(t)]))
            // one entry per target, not per worker
            .flat(1)
            // find who needs the most help
            .sort((a,b) => a[1]-b[1])
            // only engage ones that are not almost there
            .filter(a => a[1] < 0.8)
            // extract the target name
            .map(a => a[0]);
        }

        if (assignments.length == 0) {
            await netLog(ns, "No one needs help, idling.");
            await ns.sleep(60000);
            continue;
        }

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

        var ram = mode == "weaken" ? wRam : gRam;
        var threads = Math.floor(
            ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname) - reserve)/ram;
        if (threads <= 0) {
            await netLog(ns, "Not enough memory to run with %d reserved (%s available)", reserve, fmt.memory(ns.getServerMaxRam(hostname)-ns.getServerUsedRam(hostname)));
            if (reserve == 0) {
                return;
            }
            await ns.sleep(60000);
            continue;
        }

        if (mode == "weaken") {
            var start = ns.getServerSecurityLevel(target);
            await netLog(ns, "Weakening %s with %s threads, security: %.2f", target, fmt.int(threads), start);
            var pid = ns.run(wScript, threads, target);
            if (pid) {
                await netLog(ns, "waiting %s for weaken to finish...", fmt.time(ns.getWeakenTime(target)));
                await ns.sleep(ns.getWeakenTime(target));
                while (ns.scriptRunning(wScript, hostname)) {
                    await ns.sleep(1000);
                }
                await netLog(ns, "Done weakening %s with %s threads, security: %.2f", target, fmt.int(threads), ns.getServerSecurityLevel(target));
            } else {
                await ns.sleep(1000);
            }
        } else {
            var start = ns.getServerMoneyAvailable(target);
            await netLog(ns, "Growing %s with %s threads, value: %s", target, fmt.int(threads), fmt.money(start));
            var pid = ns.run(gScript, threads, target);
            if (pid) {
                await netLog(ns, "waiting %s for grow to finish...", fmt.time(ns.getGrowTime(target)));
                await ns.sleep(ns.getGrowTime(target));
                while (ns.scriptRunning(gScript, hostname)) {
                    await ns.sleep(1000);
                }
                await netLog(ns, "Done growing %s with %s threads, value: %s",
                 target, fmt.int(threads), fmt.money(ns.getServerMoneyAvailable(target)));
            } else {
                await ns.sleep(1000);
            }
        }
    }
}