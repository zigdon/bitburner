import {hosts} from "/lib/hosts.js";
import { readAssignments } from "/lib/assignments.js";
import { netLog, console } from "/lib/log.js";

var libs = [
    "/lib/log.js",
    "/lib/fmt.js",
    "/lib/ports.js",
    "/lib/ui.js",
    "/lib/hack.js",
    "/lib/state.js",
    "/lib/assignments.js",
];

var out = netLog;

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var tool = ns.args[1];
    var args = ns.args.splice(2);
    var installs = {}
    for (var t of ["weakener", "sharer", "batch", "worker"]) {
        installs[t] = [];
    }
    out = console;
    let openers = [ "BruteSSH.exe", "FTPCrack.exe", "HTTPWorm.exe", "relaySMTP.exe", "SQLInject.exe"]
        .map(f => ns.fileExists(f, "home")).length;

    if (!target || target == "all") {
        var hs = hosts(ns).filter((h) => { return !h.host.startsWith("pserv-") && !h.host.startsWith("hacknet-node-") });
        var wReq = ns.getScriptRam("/daemons/weakener.js");
        var sReq = ns.getScriptRam("/daemons/sharer.js");
        for (var i in hs) {
            var h = hs[i];
            if (h.host == "home" || h.port > openers) { 
                continue;
            }
            if (ns.isRunning("/daemons/controller.js")) {
                installs["worker"].push(h.host);
                await installWorker(ns, h.host);
            } else if (!ns.ps().every(p => p.filename != "/daemons/share.js")) {
                if (ns.getServerMaxRam(h.host) > sReq) {
                    installs["sharer"].push(h.host);
                    await installSharer(ns, h.host);
                } else {
                    installs["weakener"].push(h.host);
                    await installWeaken(ns, h.host);
                }
            } else {
                installs["weakener"].push(h.host);
                await installWeaken(ns, h.host);
            }
        }
        for (var i of Object.keys(installs)) {
            if (installs[i].length > 0) {
                await out(ns, "%s: %s", i, installs[i].join(", "));
            }
        }
        return;
    } else if (target == "pserv") {
        var hs = hosts(ns).filter((h) => { return h.host.startsWith("pserv-") });
        var req = ns.getScriptRam("/daemons/batch.js");
        var a = readAssignments(ns);
        for (var i in hs) {
            if (tool == "sharer") {
                installs["sharer"].push(hs[i].host);
                await installSharer(ns, hs[i].host);
                continue;
            }
            var h = a.find((h) => { return h.worker == hs[i].host });
            if (h && ns.getServerMaxRam(h.worker) > req) {
                installs["batch"].push(h.worker);
                await installBatch(ns, h.worker, h.target);
            } else {
                installs["weakener"].push(hs[i].host);
                await installWeaken(ns, hs[i].host);
            }
        }
        for (var i of Object.keys(installs)) {
            if (installs[i].length > 0) {
                await out(ns, "%s: %s", i, installs[i].join(", "));
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
        case "sharer":
            await installSharer(ns, target);
            break;
        case "worker":
            await installWorker(ns, target);
            break;
        default:
            await installDefault(ns, target);
    }

}

/** @param {NS} ns **/
export async function installBatch(ns, worker, target) {
    if (!target) {
        await installDefault(ns, worker);
        return;
    }
    if (ns.fileExists("/obsolete.txt", target)) {
        await out(ns, "%s is obsokete, not installing batch.", target)
        return
    }
    var files = ["/bin/weaken.js", "/bin/hack.js", "/bin/grow.js", "/daemons/batch.js", "/conf/assignments.txt"];
    files.push(libs);
    var h = readAssignments(ns).find((h) => { return h.worker == worker });
    var limit;
    if (h.targets.length > 1) {
        limit = ns.getServerMaxRam(worker) / h.targets.length;
    }
    if (target != "home") {
        await ns.scp(files, "home", worker);
        ns.scriptKill("/daemons/weakener.js", worker);
        ns.scriptKill("/daemons/share.js", worker);
        var args = [target];
        if (limit) {
            args.push(limit);
        }
        if (!ns.isRunning("/daemons/batch.js", worker, ...args)) {
            if (!ns.exec("/daemons/batch.js", worker, 1, ...args)) {
                await out(ns, "Failed to launch batch on %s", worker);
            }
        }
    }
}

export async function installWeaken(ns, worker) {
    if (worker != "home") {
        var files = ["weaken.js", "/bin/weaken.js", "/daemons/weakener.js", "/conf/assignments.txt"];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    if (ns.getServerMaxRam(worker) > ns.getScriptRam("/daemons/weakener.js")) {
        if (!ns.exec("/daemons/weakener.js", worker)) {
            await out(ns, "Failed to launch weakener on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installController(ns, worker) {
    if (worker != "home") {
        var files = ["/daemons/controller.js"];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/controller.js");
    if (ram > req) {
        if (!ns.exec("/daemons/controller.js", worker)) {
            await out(ns, "Failed to launch controller on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installWorker(ns, worker) {
    if (worker != "home") {
        var files = ["/daemons/worker.js"];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/worker.js");
    if (ram > req) {
        if (!ns.exec("/daemons/worker.js", worker, ram / req)) {
            await out(ns, "Failed to launch worker on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installSharer(ns, worker) {
    if (worker != "home") {
        var files = [
            "/daemons/share.js",
            "/bin/share.js",
        ];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/share.js") + ns.getScriptRam("/bin/share.js");
    if (ram > req) {
        if (!ns.exec("/daemons/share.js", worker)) {
            await out(ns, "Failed to launch sharer on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
export async function installContractProxy(ns, worker) {
    if (worker != "home") {
        var files = [
            "/daemons/contractProxy.js",
        ];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/contractProxy.js");
    if (ram > req) {
        if (!ns.exec("/daemons/contractProxy.js", worker)) {
            await out(ns, "Failed to launch contractProxy on %s", worker);
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 */
async function installDefault(ns, worker) {
    await out(ns, "Looking up what should be installed on %s", worker);
    var a = readAssignments(ns);
    var h = a.find((h) => { return h.worker == worker });
    if (h) {
        await out(ns, "Installing batch on %s to hack %s", h.worker, h.target);
        await installBatch(ns, h.worker, h.target);
    } else {
        await out(ns, "Installing weakener on %s", worker);
        await installWeaken(ns, worker);
    }
}