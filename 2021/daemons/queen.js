import { log, toast, netLog } from "/lib/log.js";
import { ports } from "/lib/ports.js";
import { hosts } from "/lib/hosts.js";
import { settings } from "/lib/state.js";
import * as fmt from "/lib/fmt.js";

/*
Queen bee - accepts requests, either as simple commands or as JSON
then launches operations on the bee servers. Available operations:
- weaken <target> [deltaSec] (or to minSec, by default)
- grow <target> [deltaVal] (or to maxVal, by default)
- schedule <hack|grow|weaken> target threads batchID startTX
- query (returns total available ram/cores in the fleet)
- status <jobID> (check if any of the processes for a job are still running)
- status <batchID> (check if any of the jobs for a batch are still running)

Any job started returns a jobID to the caller

When scheduling, prefer hack on servers with fewer cores, grow/weaken
on ones with more cores. Scheduled tasks start up, wait for their specified
time, then execute their operation.

When accepting JSON input, it would include an entire schedule to run.
*/

/**
 * @typedef {object} state
 * @property {number} bootID
 * @property {number} nextJob
 * @property {number} nextBatch
 * @property {number} maxJobTime
 * @property {job[]} jobs
 * @property {batch[]} batches
 * 
 * @typedef {object} batch
 * @property {string} id
 * @property {string} name
 * @property {boolean} finished
 * @property {number[]} jobs
 * 
 * @typedef {object} job
 * @property {number} id
 * @property {string?} batchID
 * @property {number} startTime
 * @property {number} duration
 * @property {number} lastSeen
 * @property {boolean} finished
 * @property {string} name
 * @property {object} args
 * @property {task[]} tasks
 * @property {boolean} partial
 * 
 * @typedef {object} task
 * @property {string} host
 * @property {number} pid
 * @property {number} threads
 *
 * @typedef {object} bee
 * @property {string} host
 * @property {string} type
 * @property {number} maxRam
 * @property {number} freeRam
 * @property {number} cores
 **/

let checkpointFile = "/conf/queen.txt";
let state = createState();
let st;

const files = [
    "/bin/weaken.js",
    "/bin/grow.js",
    "/bin/hack.js",
    "/lib/hack.js",
    "/lib/log.js",
    "/lib/ports.js",
    "/lib/fmt.js",
];

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");
    await loadCheckpoint(ns);
    st = settings(ns, "queen");
    let lastSave = 0;
    while (true) {
        if (Date.now() - lastSave > 60000) {
            await saveCheckpoint(ns);
            lastSave = Date.now();
        }
        let [pid, client, data] = await read(ns);
        let cmd = typeof (data) == "string" ? data : data.shift();

        let res;
        switch (cmd) {
            case "query":
                res = await queryHive(ns);
                break;
            case "weaken":
            case "grow":
                res = await swarmSingle(ns, cmd, ...data);
                break;
            case "schedule":
                res = await scheduleJob(ns, ...data);
                break;
            case "status":
                res = await checkStatus(ns, data[0]);
                break;
            case "list":
                res = await listJobs(ns);
                break;
            case "json":
                res = await processJSON(ns, data[0]);
                break;
            case "restart":
                await toast(ns, "Queen bee restarting...", { level: "warning" });
                ns.spawn(ns.getScriptName(), 1);
            case "quit":
                await toast(ns, "Queen bee shutting down...", { level: "success" });
                return;
            default:
                await toast(ns, "Unknown queen bee command: '%s'", cmd, { level: "warning" });
        }
        if (res) {
            await send(ns, pid, client, res);
        }
    }

}

/**
 * @returns {state}
 */
function createState() {
    return {
        bootID: -1,
        jobs: [],
        batches: [],
        nextJob: 0,
        nextBatch: 0,
        maxJobTime: 0,
    };
}

/**
 * @param {string} id
 * @param {string} name
 * @returns {batch}
 */
function newBatch(id, name) {
    let batch = {
        id: id,
        name: name,
        jobs: [],
    }
    state.batches.push(batch);
    return batch;
}

/**
 * @returns {job}
 */
function newJob() {
    return {
        id: state.nextJob++,
        startTime: Date.now(),
        lastSeen: Date.now(),
        duration: 0,
        tasks: [],
    };
}

/** @param {NS} ns */
async function listJobs(ns) {
    let res = [];
    for (let b of state.batches) {
        let [ok, status] = await checkStatus(ns, b.id);
        if (!ok) { continue; }
        res.push({
            id: b.id,
            type: "batch",
            name: b.name,
            status: status,
            jobs: b.jobs,
        })
    }
    for (let j of state.jobs) {
        let [ok, status] = await checkStatus(ns, j.id);
        if (!ok) { continue; }
        res.push({
            id: j.id,
            type: "job",
            name: j.name,
            duration: j.duration,
            startTime: j.startTime,
            status: status,
            tasks: j.tasks.map(t => `${t.host}:${t.threads}`),
        })
    }

    return res;
}

/** @param {NS} ns */
async function saveCheckpoint(ns) {
    let prunedJobs = [];
    let now = Date.now();
    for (let j of state.jobs) {
        if (now - j.lastSeen < state.maxJobTime) {
            prunedJobs.push(j);
        } else {
            delete statusCache[j.id];
        }
    }
    if (prunedJobs.length != state.jobs.length) {
        await netLog(ns, "pruned %d jobs, %d remain", state.jobs.length - prunedJobs.length, prunedJobs.length);
    }

    state.jobs = prunedJobs;
    let prunedBatches = [];
    for (let b of state.batches) {
        let found = false;
        for (let bj of b.jobs) {
            if (prunedJobs.find(j => j.id == bj)) {
                found = true;
                break;
            }
        }
        if (found) {
            prunedBatches.push(b);
        } else {
            delete statusCache[b.id];
        }
    }
    if (prunedBatches.length != state.batches.length) {
        await netLog(ns, "pruned %d batches, %d remain", state.batches.length - prunedBatches.length, prunedBatches.length);
    }
    state.batches = prunedBatches;
    await netLog(ns, "Saving checkpiont with %d jobs and %d batches", state.jobs.length, state.batches.length);
    let saveStart = Date.now();
    await ns.write(checkpointFile, JSON.stringify(state, null, 2), "w");
    await netLog(ns, "Saving took %s", fmt.time(Date.now()-saveStart, {digits: 2}))
}

/** @param {NS} ns */
async function loadCheckpoint(ns) {
    let p = ns.getPlayer();
    let bootID = p.playtimeSinceLastBitnode - p.playtimeSinceLastAug;
    if (ns.fileExists(checkpointFile, "home")) {
        state = JSON.parse(ns.read(checkpointFile));
        if (state.bootID != bootID) {
            await netLog(ns, "Discarding state from previous boot (%s != %s).", state.bootID, bootID);
            state = createState();
        }
    } else {
        state = createState();
    }
    state.bootID = bootID;
    await netLog(ns, "Loaded checkpoint for boot %d, %d jobs", state.bootID, state.jobs.length);
}

let statusCache = {};
/**
 * @param {NS} ns
 * @param {string} id
 * @returns {[running: boolean, tasks: [host: string, running: boolean]]}
 */
async function checkStatus(ns, id) {
    let now = Date.now();
    let res;
    if (statusCache[id] && (!statusCache[id].timeout || now - statusCache[id].ts < statusCache[id].timeout)) {
        return statusCache[id].res;
    }
    if (String(id).startsWith("b-")) {
        let batch = state.batches.find(b => b.id == id);
        if (!batch) {
            res = [false, ["none", false]];
            await netLog(ns, "Unknown batch %s", id);
            return res;
        }
        if (batch.finished) {
            res = [false, ["all", false]];
            statusCache[id] = {ts: now, timeout: false, res: res};
            return res;
        }
        let status = batch.jobs.map(j => [j, checkStatus(ns, j)[0]]);
        batch.finished = !status.every(j => !j[1]);
        return [batch.finished, status];
    }
    let job = state.jobs.find(j => j.id == id);
    if (!job) {
        await netLog(ns, "Unknown job %d", id);
        return [false, ["none", false]];
    }
    if (job.finished) {
        // await netLog(ns, "Job %d finished", id);
        res = [false, ["all", false]];
        statusCache[id] = {ts: now, timeout: false, res: res};
        return res;
    }
    job.lastSeen = now;
    let pss = {};
    job.tasks.forEach(t => pss[t.host] ||= ns.ps(t.host).map(p => p.pid));
    let tasks = job.tasks.map(t => [t.host, pss[t.host].includes(t.pid)]);
    job.finished = !tasks.every(s => !s[1]);
    res = [job.finished, tasks];
    // await netLog(ns, "Job %d: %s", job.id, JSON.stringify(res, null, 2));
    statusCache[id] = {ts: now, timeout: 5000, res: res};
    return res;
}

/**
 * @param {NS} ns
 * @param {string} cmd
 * @param {string} target
 * @param {number} threads
 * @param {string} batchID
 * @param {number} startTS
 */
async function scheduleJob(ns, cmd, target, threads, batchID, startTS) {
    let hive = await queryHive(ns);
    if (batchID && !batchID.startsWith("b-")) {
        await netLog(ns, "Invalid batch ID, must start with 'b-': '%s'", batchID);
        return [false, "Invalid batch ID"];
    }
    batchID ||= "b-" + state.nextBatch++;

    let batch = state.batches.find(b => b.id == batchID);
    if (!batch) {
        batch = newBatch(batchID, target);
    }

    // if the command is 'hack', prefer scheduling on bees with fewer cores
    if (cmd == "hack") {
        hive.sort((a, b) => a.cores - b.cores);
    } else {
        hive.sort((a, b) => b.cores - a.cores);
    }

    let job = newJob();
    job.name = `${batchID}.${cmd}/${target}`;
    job.batchID = batchID;
    job.args = {
        cmd: cmd,
        target: target,
    }
    batch.jobs.push(job);
    return [true, await startJob(ns, job, target, threads, hive, startTS)];
}

/**
 * @param {NS} ns
 * @param {string} cmd
 * @param {string} target
 * @param {number} delta
 */
async function swarmSingle(ns, cmd, target, delta) {
    let hive = await queryHive(ns);
    let cores = Math.min(...hive.map(b => b.cores));
    let threads = 1;
    if (cmd == "weaken") {
        delta ||= ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
        while (ns.weakenAnalyze(threads, cores) < delta) {
            threads++;
        }
        await netLog(ns, "Need %d threads to weaken %s by %.2f", threads, target, delta);
    } else {
        delta ||= ns.getServerMaxMoney(target) / (1+ns.getServerMoneyAvailable(target));
        delta = Math.max(1, delta)
        threads = Math.ceil(ns.growthAnalyze(target, delta, cores));
        await netLog(ns, "Need %d threads to grow %s by %.2f", threads, target, delta);
    }

    let job = newJob();
    job.name = `${cmd}/${target}`;
    job.args = {
        cmd: cmd,
        target: target,
        delta: delta,
    };
    return [true, await startJob(ns, job, target, threads, hive)];
}

/**
 * @param {NS} ns
 * @param {job} job
 * @param {string} target
 * @param {number} threads
 * @param {bee[]} hive
 * @param {number} startTS
 * @returns {job}
 */
async function startJob(ns, job, target, threads, hive, startTS) {
    const scripts = {
        "hack": {
            path: "/bin/hack.js",
            mem: ns.getScriptRam("/bin/hack.js"),
            time: ns.getHackTime(target),
        },
        "grow": {
            path: "/bin/grow.js",
            mem: ns.getScriptRam("/bin/grow.js"),
            time: ns.getGrowTime(target),
        },
        "weaken": {
            path: "/bin/weaken.js",
            mem: ns.getScriptRam("/bin/weaken.js"),
            time: ns.getWeakenTime(target),
        },
    };

    job.duration = scripts[job.args.cmd].time;
    if (state.maxJobTime < job.duration) {
        state.maxJobTime = job.duration;
    }

    if (st.read("useHomeBee") > 0) {
        let srv = ns.getServer("home");
        hive.push(
            {
                host: "home",
                type: "home",
                maxRam: srv.maxRam,
                freeRam: srv.maxRam - srv.ramUsed - st.read("useHomeBee"),
                cores: srv.cpuCores,
            }
        );
    }

    for (let bee of hive) {
        if (threads <= 0) { break; }
        if (bee.freeRam > scripts[job.args.cmd].mem) {
            let t = Math.floor(bee.freeRam / scripts[job.args.cmd].mem);
            if (t > threads) { t = threads; }
            if (startTS) {
                await netLog(ns, "Scheduling %d threads of %s on %s in %s", t, job.args.cmd, bee.host, fmt.time(startTS-Date.now()));
            } else {
                await netLog(ns, "Starting %d threads of %s on %s", t, job.args.cmd, bee.host);
            }
            let pid;
            if (startTS) {
                pid = ns.exec(scripts[job.args.cmd].path, bee.host, t, target, job.id, "--start", startTS);
            } else {
                pid = ns.exec(scripts[job.args.cmd].path, bee.host, t, target, job.id);
            }
            if (pid == 0) {
                await netLog(ns, "Failed to launch on %s!", bee.host);
                continue;
            }
            threads -= t;
            job.tasks.push({ host: bee.host, pid: pid, threads: t });
            bee.freeRam = ns.getServerMaxRam(bee.host) - ns.getServerUsedRam(bee.host);
        }
    }
    if (threads > 0) {
        await netLog(ns, "Couldn't find bees for %d threads", threads);
        job.partial = true;
    } else {
        job.partial = false;
    }
    state.jobs.push(job);
    return job;
}

/**
 * @param {NS} ns
 * @param {number} pid
 */
function debug(ns, pid) {
    let peer = st.read("debugJSON");
    if (!peer) { return false; }
    let client = ns.ps("home").find(p => p.pid == pid);
    if (!client) { return false; }
    return client.filename.includes(peer);
}

/**
 * @param {NS} ns
 * @param {number} pid
 * @param {string} client
 * @param {object} data
 */
async function send(ns, pid, client, data) {
    if (st.read("logJSON") || debug(ns, pid)) {
        await log(ns, `Sending reply to ${pid}@${client}: ${JSON.stringify(data, null, 2)}`);
    }
    let msg = `${pid}@${client}: ${JSON.stringify(data)}`;
    await ns.writePort(ports.BEES, msg);
}

/**
 * @param {NS} ns
 * @returns {[number, string, any]}
 */
async function read(ns) {
    while (true) {
        let out = ns.peek(ports.BEES);
        if (!out.startsWith("NULL")) {
            let env = out.split(": ")[0];
            if (!env) {
                await netLog(ns, "noise in outgoing queue: %s", out);
                ns.readPort(ports.BEES);
                continue;
            }
            let [pid, client] = env.split("@");
            if (!ns.ps(client).find(p => p.pid == pid)) {
                await netLog(ns, "removing obsolete reply found for %s", env);
                ns.readPort(ports.BEES);
                continue;
            }
        }
        let data = String(ns.readPort(ports.QUEEN));
        if (data.startsWith("NULL")) {
            await ns.sleep(100);
            continue;
        }

        if (["restart", "quit"].includes(data)) {
            return [0, "manual", data];
        }
        let m = data.match(/^([0-9]+)@?(\w+)?\s(.*)/);
        if (m) {
            let [_, pid, client, blob] = m;
            await netLog(ns, "Got request from %d@%s %d bytes", Number(pid), client, blob.length);
            return [pid, client, JSON.parse(blob)];
        }
        await netLog(ns, "ignoring obsolete request: %s", data);
        continue;
    }

}

let hiveCache;
let hiveCacheTS = 0;
let knownBees = [];
/**
 * @param {NS} ns
 * @returns {bee[]}
 */
async function queryHive(ns) {
    if (hiveCache && Date.now() - hiveCacheTS < st.read("cacheHiveSeconds") * 1000) {
        return hiveCache;
    }
    let bees = [];
    if (st.read("useHacknetBees")) {
        bees.push(...[...Array(ns.hacknet.numNodes()).keys()].map(i => "hacknet-node-" + i));
    }
    if (st.read("usePurchasedBees")) {
        bees.push(...ns.getPurchasedServers());
    }
    if (st.read("useWildBees")) {
        bees.push(...hosts(ns).filter(
            h => h.root && !h.purchased && !h.host.startsWith("hacknet-node-") && h.host != "home"
        ).map(h => h.host));
    }
    let hive = [];
    for (let s of bees) {
        if (ns.fileExists("obsolete.txt", s)) {
            knownBees = knownBees.filter(b => b != s);
            await netLog(ns, "Skipping obsolete bee %s", s);
            continue;
        }
        let srv = ns.getServer(s);
        if (srv.maxRam == 0) {
            continue;
        }
        if (!knownBees.includes(s)) {
            await ns.scp(files, s);
            knownBees.push(s);
        }
        hive.push(
            {
                host: s,
                type: s.startsWith("hacknet-node-") ? "hacknet" : s.startsWith("pserv-") ? "pserv" : "wild",
                maxRam: srv.maxRam,
                freeRam: srv.maxRam - srv.ramUsed,
                cores: srv.cpuCores,
            },
        );
    }

    hiveCache = hive;
    hiveCacheTS = Date.now();
    return hive;
}

/**
 * @param {NS} ns
 * @param {string} fname
 */
async function processJSON(ns, fname) {
    if (!ns.fileExists(fname)) {
        await toast(ns, "JSON input not found at %s", fname, {level: "warning"});
        return;
    }
    let batchData = JSON.parse(ns.read(fname));
    let delay = st.read("batchDelay") || 1000;
    let start = Date.now() + delay;
    let batch = newBatch(`b-json-${state.nextBatch++}`);
    await netLog(ns, "Scheduling batch %s from %s", batch.id, fname);
    for (let op of batchData.schedule) {
        let [ok, job] = await scheduleJob(ns, op.proc, batchData.target, op.threads, batch.id, start + op.ts);
        if (!ok) {
            await netLog(ns, "Couldn't schedule %s/%s/%n", op.proc, op.target, op.ts)
            return [false, `Couldn't schedule ${op.proc}/${op.target}/${op.ts}`];
        }
    }

    return [true, batch.id];
}