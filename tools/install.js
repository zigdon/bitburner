import * as hosts from "/lib/hosts.js";

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var tool = ns.args[1];
    var args = ns.args.splice(2);

    if (target == "all") {
        var hs = hosts.hosts(ns).filter((h) => {return !h.host.startsWith("pserv-")});
        var req = ns.getScriptRam("/daemons/weakener.js");
        for (var i in hs) {
            var h = hs[i];
            if (h.host == "hone") {
                continue;
            }
            ns.tprintf("installing weakener on %s", h.host);
            if (ns.getServerMaxRam(h.host) > req) {
                await installWeaken(ns, h.host);
            }
        }
        return;
    }

    switch (tool) {
        case "batch":
            await installBatch(ns, target, args[0]);
            break;
        case "weaken":
            await installWeaken(ns, target);
            break;
        case "controller":
            await installController(ns, target);
            break;
        case "worker":
            await installWorker(ns, target);
            break;
        default:
            ns.tprintf("Looking up what should be installed on %s", target);
            var a = readAssignments(ns);
            var h = a.find((h) => {return h.worker == target});
            if (h) {
                ns.tprintf("Installing batch on %s to hack %s", h.worker, h.target);
                await installBatch(ns, h.worker, h.target);
            } else {
                ns.tprintf("Installing weakener on %s", target);
                await installWeaken(ns, target);
            }
    }

}

export async function installBatch(ns, worker, target) {
    if (target != "home") {
        await ns.scp(
            ["weaken.js", "hack.js", "grow.js", "/daemons/batch.js", "/lib/assignments.txt",
                "/lib/fmt.js", "/lib/log.js"], "home", worker);
        ns.killall(worker);
    }
    if (!ns.exec("daemons/batch.js", worker, 1, target)) {
        ns.tprintf("Failed to launch batch on %s", worker);
    }
}

export async function installWeaken(ns, worker) {
    if (worker != "home") {
        await ns.scp(
            ["weaken.js", "/daemons/weakener.js",
            "/lib/fmt.js", "/lib/log.js", "/lib/assignments.txt"], "home", worker);
        ns.killall(worker);
    }
    if (ns.getServerMaxRam(worker) > ns.getScriptRam("/daemons/weakener.js")) {
        if (!ns.exec("/daemons/weakener.js", worker)) {
            ns.tprintf("Failed to launch weakener on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installController(ns, worker) {
    if (worker != "home") {
        await ns.scp(["/daemons/controller.js", "/lib/log.js", "/lib/fmt.js"], "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/controller.js");
    if (ram > req) {
        if (!ns.exec("/daemons/controller.js", worker)) {
            ns.tprintf("Failed to launch controller on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installWorker(ns, worker) {
    if (worker != "home") {
        await ns.scp(["/daemons/worker.js", "/lib/log.js", "/lib/fmt.js"], "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/worker.js");
    if (ram > req) {
        if (!ns.exec("/daemons/worker.js", worker, ram/req)) {
            ns.tprintf("Failed to launch worker on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @returns {Object[]}
 */
export function readAssignments(ns) {
    var data = ns.read("/lib/assignments.txt")
    if (!data) {
        return [];
    }
    var res = [];
    data.split("\n").forEach((l) => {
        var bits = l.trim().split("\t");
        res.push({worker: bits[0], target: bits[1]});
    })

    return res;
}