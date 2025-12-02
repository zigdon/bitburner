import {netLog, console} from "/lib/log.js";
import {installBatch, installContractProxy} from "/tools/install.js";
import {readAssignments} from "/lib/assignments.js";
import {hosts, getHost} from "/lib/hosts.js";
import {log} from "/lib/log.js";
import {settings} from "/lib/state.js";
import * as fmt from "/lib/fmt.js";

let hs;
let assignments;
let custom;
let st;

let out = console;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("getServerMaxRam");
    ns.clearLog();
    let flags = ns.flags([
        ["quiet", false],
    ])
    if (flags.quiet) {
        out = netLog;
    }
    st = settings(ns, "assign");
    
    hs = hosts(ns);
    assignments = readAssignments(ns);
    custom = {};
    let myHack = ns.getHackingLevel();
    let targets = hs.filter((h) => { return h.root && h.hack < myHack && h.max > 0 });
    targets.sort((a, b) => { return b.max - a.max })
    let data = targets.map(h => [h.host, fmt.large(h.max)]);
    await out(ns, "Found %d targets:\n%s", targets.length, fmt.table(data));
    let workers = ns.getPurchasedServers();
    if (st.get("batchOnHacknet")) {
        workers.push(...ns.scan("home").filter(h => h.startsWith("hacknet-node-")))
    }
    let servers = workers
        .map(s => {return {
            host: s,
            mem: ns.getServerMaxRam(s),
            assignments: assignments.filter(a => a.worker == s).map(a => a.targets).flat()}});
    servers.forEach(s => {
        s.slots = s.mem > 50000 ? Math.floor(s.mem/50000) : 1;
        s.free = s.slots - s.assignments || 0;
    })
    let slots = servers.reduce((t, s) => t + s.slots, 0);
    await out(ns, "%d total slots available across %d servers", slots, servers.length);
    
    let used = {};
    assignments.forEach((a) => {
        let jobs = used[a.worker] || [];
        if (a.target.startsWith("<")) {
            custom[a.target.substring(1, a.target.length-2)] = a.worker;
        }
        if (a.target && ! a.targets) {
            a.targets = [a.target];
        }
        jobs.push(...a.targets);
        used[a.worker] = jobs;
    });
    for (let c of Object.entries(custom)) {
        await out(ns, "Found existing custom assignment: %s -> %s", c[0], c[1])
    }

    let missing = [];
    let free = [];
    let idle = [];

    // More targets than capacity
    if (slots < targets.length) {
        let minVal = 0;
        if (targets.length > servers.length) {
            minVal = targets[servers.length].max;
        }
    
        // Find servers to free up
        if (minVal > 0) {
            let msgs = [];
            let drop = [];
            msgs.push(["abandoning servers worth less than %s", fmt.money(minVal)]);
            assignments.forEach((a) => {
                for (let t of a.targets) {
                    let h = getHost(ns, t);
                    if (!h || Number(h.max) <= minVal) {
                        if (servers.find(s => s.host == a.worker)) {
                            msgs.push(["Freeing up %s, was working on %s", a.worker, t]);
                            free.push([a.worker, t]);
                        } else {
                            drop.push(a.worker);
                            msgs.push(["Abandoning %s, leaving idle", a.worker]);
                            if (ns.scriptKill("/daemons/batch.js", a.worker)) {
                                msgs.push(["Killed batcher on %s", a.worker]);
                            }
                        }
                    }
                }
            });
            if (msgs.length > 1) {
                for (let i in msgs) {
                    await out(ns, ...msgs[i]);
                }
            }
            assignments = assignments.filter(a => !drop.includes(a.worker));
        }
    }

    // Find idle servers
    idle = servers.filter(s => !used[s.host]).map(s => s.host);
    if (idle.length > 0) {
        await out(ns, "Found %d idle servers: %s", idle.length, idle);
    }
    free.push(...idle.map(i => [i, null]));

    // Find unused targets
    await out(ns, "Looking for unassigned targets");
    for (let t of targets) {
        if (assignments.find(a => a.target == t.host || a.targets.indexOf(t.host) > -1)) {
            continue;
        }
        missing.push(t);
    }

    if (missing.length > 0) {
        await out(ns, "%d targets missing workers: %s",
            missing.length, missing.map(t => t.host));
    }

    while (missing.length > 0) {
        let target = missing.shift().host;

        let freeSlot = getSlot(ns, servers, free);
        if (!freeSlot) {
            await out(ns, "Can't find worker for %s!", target);
            break;
        }
        let worker = freeSlot[0];
        let curTask = assignments.find(a => a.worker == worker);
        if (!curTask) {
            curTask = {worker: worker, target: "", targets: []};
        }
        assignments = assignments.filter((a) => { return a.worker != worker });
        if (freeSlot[1] != null) {
            curTask.targets = curTask.targets.filter(t => t != freeSlot[1]);
            await killTask(ns, worker, freeSlot[1]);
        }
        await out(ns, "directing %s to work on %s", worker, target);
        if (curTask.targets.indexOf(target) == -1) {
            curTask.targets.push(target);
        }
        curTask.target = curTask.targets[0];
        let curServer = servers.find(s => s.host == worker);
        curServer.assignments = curTask.targets;
        assignments.push(curTask);
    }

    await saveAssignments(ns);

    if (st.read("hiveBatching")) {
        await out(ns, "Not starting batchers, hiveBatching enabled");
        return;
    }

    // Make sure the assigned servers are actually running
    for (let i=0; i<assignments.length; i++) {
        await ns.sleep(100);
        let a = assignments[i];
        for (let target of a.targets) {
            if (target.startsWith("<")) {
                switch(target) {
                    case "<contractProxy>":
                        await installContractProxy(ns, a.worker);
                        break;
                    default:
                        await out(ns, "Unknown assignment %s for %s", target, a.worker);
                }
                continue
            }
            if (ns.isRunning("/daemons/batch.js", a.worker, target) ||
                ns.fileExists("obsolete.txt", a.worker)) {
                continue;
            }
            await out(ns, "Restarting batch on %s for %s", a.worker, target);
            await installBatch(ns, a.worker, target);
        }
    }
}

/**
 * @param {NS} ns
 * @param {object[]} servers
 * @param {string[][]} free
 */
function getSlot(ns, servers, free) {
    // If there's a free server, just return that one
    if (free.length > 0) {
        log(ns, "Found a free server %s", free[0])
        return free.shift();
    }

    // If not, see if there's a server with more slots than targets
    let res = servers.find(s => s.assignments && s.slots > s.assignments.length);
    if (res) {
        log(ns, "%s has %d slots, and %d assignments. Considering it available.",
          res.host, res.slots, res.assignments.length);
        return [res.host, null]
    } else {
        return null
    }
}

/**
 * @param {NS} ns
 */
async function saveAssignments(ns) {
    let data = [];
    assignments.forEach((a) => {data.push([a.worker, ...a.targets].join("\t"))});
    await ns.write("/conf/assignments.txt", data.join("\n"), "w");
}

/**
 * @param {NS} ns
 * @param {string} daemon
 */
function assignCustom(ns, daemon) {
    if (!custom[daemon]) {
        let need = ns.getScriptRam("/daemons/" + daemon + ".js");
        for (let i = targets.length-1; i>0; i--) {
            if (ns.getServerMaxRam(targets[i].host) > need) {
                custom[daemon] = targets[i].host;
                assignments.push({worker: targets[i].host, target: "<"+daemon+">"});
                break;
            }
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} worker
 * @param {string} target
 **/
async function killTask(ns, worker, target) {
    let pid = ns.getRunningScript("/daemons/batch.js", worker, target)
    if (!pid) {
        return;
    }
    await out(ns, "Stopping %s task on %s", target, worker);
    if (!ns.kill("/daemons/batch.js", worker, target)) {
        await out(ns, "Failed to kill %d", pid);
    }
}