import {netLog, console} from "/lib/log.js";
import {readAssignments} from "/lib/assignments.js";
import {hosts,getHost} from "/lib/hosts.js";
import * as fmt from "/lib/fmt.js";

var hs;
var assignments;
var custom;

var out = console;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var flags = ns.flags([
        ["quiet", false],
    ])
    if (flags.quiet) {
        out = netLog;
    }
    
    var startCnt = Number(ns.args[0]);
    if (startCnt > 0) {
        await out(ns, "Starting at most %d tasks", startCnt);
    } else {
        await out(ns, "Starting all tasks");
    }
    hs = hosts(ns);
    assignments = readAssignments(ns);
    custom = new Map();
    hs = hs.filter((h) => { return h.root && h.max > 0 });
    hs.sort((a, b) => { return b.max - a.max })
    var data = hs.map(h => [h.host, fmt.large(h.max)]);
    await out(ns, "Found %d targets:\n%s", hs.length, fmt.table(data));
    var servers = ns.getPurchasedServers();
    var used = new Map();
    assignments.forEach((a) => {
        if (a.target.startsWith("<")) {
            custom.set(a.target.substring(1, a.target.length-2), a.worker);
        }
        used.set(a.worker, true);
    });
    for (var c of custom) {
        await out(ns, "Found existing custom assignment: %s -> %s", c[0], c[1])
    }
    var minVal = 0;
    if (hs.length > servers.length) {
        minVal = hs[servers.length].max;
    }
    var missing = [];
    var free = [];
    var idle = [];

    // Find servers to free up
    if (minVal > 0) {
        var msgs = [];
        msgs.push(["abandoning servers worth less than $%s", fmt.int(minVal)]);
        assignments.forEach((a) => {
            if (a.target.startsWith("<") || !a.worker.startsWith("pserv-")) {
                return;
            }
            var h = getHost(ns, a.target);
            if (!h || Number(h.max) <= minVal) {
                msgs.push(["Freeing up %s, was working on %s", a.worker, a.target]);
                free.push(a.worker);
            }
        });
        if (msgs.length > 1) {
            for (var i in msgs) {
                await out(ns, ...msgs[i]);
            }
        }
    }

    // Find idle servers
    servers.forEach((s) => { if (!used.has(s)) { idle.push(s) }});
    if (idle.length > 0) {
        await out(ns, "Found %d idle servers: %s", idle.length, idle);
    }
    free.push(...idle);

    // Find unused targets
    await out(ns, "Looking for old targets in %d servers", servers.length);
    for (var i=0; i<servers.length; i++) {
        var target = hs.shift();
        if (!target) {
            break;
        }
        if (assignments.find((a) => {return a.target == target.host})) {
            continue;
        }
        missing.push(target);
    }

    if (missing.length > 0) {
        await out(ns, "%d targets missing workers: %s",
            missing.length, missing.map((t) => {return t.host}));
    }

    while (missing.length > 0) {
        var target = missing.shift().host;
        var worker = free.shift();
        if (!worker) {
            await out(ns, "Can't find worker for %s!", target);
            break;
        }
        assignments = assignments.filter((a) => { return a.worker != worker });
        await out(ns, "directing %s to work on %s", worker, target);
        assignments.push({worker: worker, target: target});
    }

    await saveAssignments(ns);
}

/**
 * @param {NS} ns
 */
async function saveAssignments(ns) {
    var data = [];
    assignments.forEach((a) => {data.push([a.worker, a.target].join("\t"))});
    await ns.write("/conf/assignments.txt", data.join("\n"), "w");
}

/**
 * @param {NS} ns
 * @param {string} daemon
 */
function assignCustom(ns, daemon) {
    if (!custom.get(daemon)) {
        var need = ns.getScriptRam("/daemons/" + daemon + ".js");
        for (var i = hs.length-1; i>0; i--) {
            if (ns.getServerMaxRam(hs[i].host) > need) {
                custom.set(daemon, hs[i].host);
                assignments.push({worker: hs[i].host, target: "<"+daemon+">"});
                break;
            }
        }
    }
}