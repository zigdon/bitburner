import * as hosts from "/lib/hosts.js";
import {readAssignments} from "/lib/assignments.js";

var libs = [
    "/lib/log.js",
    "/lib/fmt.js",
    "/lib/assignments.js",
];

/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var tool = ns.args[1];
    var args = ns.args.splice(2);

    if (!target || target == "all") {
        var hs = hosts.hosts(ns).filter((h) => {return !h.host.startsWith("pserv-")});
        var req = ns.getScriptRam("/daemons/weakener.js");
        for (var i in hs) {
            var h = hs[i];
            if (h.host == "home") {
                continue;
            }
            if (ns.getServerMoneyAvailable("home") < 1000000000000) { // $1t
                ns.tprintf("installing weakener on %s", h.host);
                if (ns.getServerMaxRam(h.host) > req) {
                    await installWeaken(ns, h.host);
                }
            } else {
                ns.tprintf("installing sharer on %s", h.host);
                await installSharer(ns, h.host);
            }
        }
        return;
    } else if (target == "pserv") {
        var hs = hosts.hosts(ns).filter((h) => {return h.host.startsWith("pserv-")});
        var req = ns.getScriptRam("/daemons/batch.js");
        var a = readAssignments(ns);
        for (var i in hs) {
            var h = a.find((h) => {return h.worker == hs[i].host});
            if (h && ns.getServerMaxRam(h.worker) > req) {
                ns.tprintf("Installing batch on %s to hack %s", h.worker, h.target);
                await installBatch(ns, h.worker, h.target);
            } else {
                ns.tprintf("Installing weakener on %s", hs[i].host);
                await installWeaken(ns, hs[i].host);
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
        var files = ["weaken.js", "hack.js", "grow.js", "/daemons/batch.js", "/conf/assignments.txt"];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    if (!ns.exec("daemons/batch.js", worker, 1, target)) {
        ns.tprintf("Failed to launch batch on %s", worker);
    }
}

export async function installWeaken(ns, worker) {
    if (worker != "home") {
        var files = ["weaken.js", "/daemons/weakener.js", "/conf/assignments.txt"];
        files.push(libs);
        await ns.scp(files, "home", worker);
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
        var files = ["/daemons/controller.js"];
        files.push(libs);
        await ns.scp(files, "home", worker);
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
        var files = ["/daemons/worker.js"];
        files.push(libs);
        await ns.scp(files, "home", worker);
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
 * @param {string} worker
 */
export async function installSharer(ns, worker) {
    if (worker != "home") {
        var files = [
            "/daemons/share.js",
            "/tools/share.js",
        ];
        files.push(libs);
        await ns.scp(files, "home", worker);
        ns.killall(worker);
    }
    var ram = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
    var req = ns.getScriptRam("/daemons/share.js") + ns.getScriptRam("/tools/share.js");
    if (ram > req) {
        if (!ns.exec("/daemons/share.js", worker)) {
            ns.tprintf("Failed to launch sharer on %s", worker);
        }
    }
}