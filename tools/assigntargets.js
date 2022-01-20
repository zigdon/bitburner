import {netLog, console} from "/lib/log.js";
import {installBatch} from "/tools/install.js";
import {readAssignments} from "/lib/assignments.js";
import * as hosts from "/lib/hosts.js";
import * as fmt from "/lib/fmt.js";

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var startCnt = Number(ns.args[0]);
    if (startCnt > 0) {
        await netLog(ns, "Starting at most %d tasks", startCnt);
    } else {
        await netLog(ns, "Starting all tasks");
    }
    var hs = hosts.hosts(ns);
    hs = hs.filter((h) => { return h.root && h.max > 0 });
    hs.sort((a, b) => { return b.max - a.max })
    var servers = ns.getPurchasedServers();
    var assignments = readAssignments(ns);
    var used = new Map();
    assignments.forEach((a) => {
        used.set(a.worker, true);
    });
    var minVal = 0;
    if (hs.length > servers.length) {
        minVal = hs[servers.length].max;
    }
    var missing = [];
    var free = [];
    var idle = [];

    // Find servers to free up
    if (minVal > 0) {
        await console(ns, "abandoning servers worth less than $%s", fmt.int(minVal));
        var msgs = [];
        assignments.forEach((a) => {
            var h = hosts.getHost(ns, a.target);
            if (!h || Number(h.max) <= minVal) {
                msgs.push(["Freeing up %s, was working on %s", a.worker, a.target]);
                free.push(a.worker);
            }
        });
        for (var i in msgs) {
            await netLog(ns, ...msgs[i]);
        }
    }

    // Find idle servers
    servers.forEach((s) => { if (!used.has(s)) { idle.push(s) }});
    await console(ns, "Found %d idle servers: %s", idle.length, idle);
    idle.forEach((s) => { free.push(s) });

    // Find unused targets
    await netLog(ns, "Looking for old targets in %d servers", servers.length);
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

    await console(ns, "%d targets missing workers: %s",
        missing.length, missing.map((t) => {return t.host}));

    while (missing.length > 0) {
        var target = missing.shift().host;
        var worker = free.shift();
        if (!worker) {
            await console(ns, "Can't find worker for %s!", target);
            break;
        }
        assignments = assignments.filter((a) => { return a.worker != worker });
        await console(ns, "directing %s to work on %s", worker, target);
        if (startCnt-- < 0) {
            await netLog(ns, "Not starting batch on %s for %s", worker, target);
        } else {
            await netLog(ns, "Starting batch on %s for %s", worker, target);
            await installBatch(ns, worker, target);
        }
        assignments.push({worker: worker, target: target});
    }

    await saveAssignments(ns, assignments);

    // Make sure the assigned servers are actually running
    for (var i=0; i<assignments.length; i++) {
        await ns.sleep(100);
        var a = assignments[i];
        if (ns.isRunning("/daemons/batch.js", a.worker, a.target)) {
            continue;
        }
        if (startCnt-- < 0) {
            await netLog(ns, "Not restarting batch on %s for %s", a.worker, a.target);
        } else {
            await console(ns, "Restarting batch on %s for %s", a.worker, a.target);
            await installBatch(ns, a.worker, a.target);
        }
    }
}

/**
 * @param {NS} ns
 * @param {Object[]} assignments
 */
async function saveAssignments(ns, assignments) {
    var data = [];
    assignments.forEach((a) => {data.push([a.worker, a.target].join("\t"))});
    await ns.write("/conf/assignments.txt", data.join("\n"), "w");
}