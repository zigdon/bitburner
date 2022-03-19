import * as fmt from "/lib/fmt.js";
import {hosts} from "/lib/hosts.js";
import * as hive from "/lib/hive.js";
import {settings} from "/lib/state.js";
import {toast, netLog} from "/lib/log.js";
import {printPlans, planBatch} from "/lib/hack.js";

/*
- Find all the hosts that we should be hacking (probably all of them?)
- Skip host if there's still a batch pending
- Allocate each a % of the total memory the hive has (- some reserved %), weighted by value?
- Get each to MS/MV
- Plan a batch for each with the allocated memory
- Send to the queen for scheduling
- Note when the batch should have been completed by
- Repeat
*/

let st;

/** @param {NS} ns **/
export async function main(ns) {
    st = settings(ns, "director");
    ns.disableLog("ALL");
    ns.clearLog();

    let knownBad = {};
    while (true) {
        let targets = await getTargets(ns, knownBad);
        for (let kb of Object.entries(knownBad)) {
            await netLog(ns, "knownbad: %s - %s, %s", kb[0], fmt.memory(kb[1].mem), kb[1].age)
        }
        for (let t of targets) {
            await ns.sleep(5000);
            let jobs = await hive.list(ns);
            let host = t.target.host;
            if (knownBad[host] && knownBad[host].mem == t.mem) {
                await netLog(ns, "skipping known bad %s with %s", host, fmt.memory(t.mem, {digits:2}));
                continue
            }
            if (knownBad[host]) {
                await toast(ns, "Trying to batch %s with %s", host, fmt.memory(t.mem, {digits:2}));
                delete knownBad[host];
            }
            if (jobs && await batchRunning(ns, t, jobs)) {
                await netLog(ns, "%s still running...", host);
                continue
            }
            if (await prepareTarget(ns, t, jobs)) {
                await netLog(ns, "%s is being prepared (%d/%d, %s/%s)...",
                    host, ns.getServerSecurityLevel(host), ns.getServerMinSecurityLevel(host),
                    fmt.money(ns.getServerMoneyAvailable(host)), fmt.money(ns.getServerMaxMoney(host)));
                continue;
            }
            if (await batchTarget(ns, t)) {
                await netLog(ns, "started batch for %s", host);
            } else {
                knownBad[host] = {mem: t.mem, val: ns.getServerMaxMoney(host)};
                await toast(ns, "couldn't start batch for %s with %s", host, fmt.memory(t.mem));
            }
        }
        await netLog(ns, "waiting for next iteration...")
        await ns.sleep(10000);
    }
}

/**
 * @param {NS} ns
 * @param {string} target
 */
async function batchTarget(ns, target) {
    let host = target.target.host;
    let fname = `/json/${host}/${target.mem}-${target.cores}.json.txt`;
    if (ns.fileExists(fname, "home")) {
        await netLog(ns, "Reusing plan from %s", fname);
    } else {
        let old = ns.ls("home", `/json/${host}`);
        if (old.length > 0) {
            await netLog(ns, "Removing %d old plans for %s", old.length, host);
            old.forEach(f => ns.rm(f, "home"));
        }
        await toast(ns, "Creating batch plans for %s with %s and %d cores", host, fmt.memory(target.mem), target.cores);
        let plans = await planBatch(ns, st.read("batchGap"), target.mem, target.cores, host);
        if (!plans) {
            await netLog(ns, "Error getting plans for %s!", host);
            return false;
        }
        plans = plans.filter(b => b);
        if (plans.length == 0) {
            await netLog(ns, "No batch options found for %s!", host);
            return false;
        }
        await netLog(ns, "\n%s", printPlans(plans));
        await netLog(ns, "Saving JSON to %s", fname);
        await ns.write(fname, JSON.stringify(plans[0], null, 2), "w");
    }

    await netLog(ns, "Launching batch for %s", host);
    let batchID = await hive.batch(ns, fname);
    await netLog(ns, "Batch scheduled: %s", batchID);
    return true;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {job[]} jobs
 */
async function prepareTarget(ns, target, jobs) {
    let host = target.target.host;
    if (ns.getServerSecurityLevel(host) != ns.getServerMinSecurityLevel(host)) {
        if (!jobs || !jobs.find(j => j.name.includes(host))) {
            await hive.swarmSingle(ns, "weaken", host);
            return true;
        }
    }
    if (ns.getServerMoneyAvailable(host) != ns.getServerMaxMoney(host)) {
        if (!jobs || !jobs.find(j => j.name.includes(host))) {
            await hive.swarmSingle(ns, "grow", host);
            return true;
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {job[]} jobs
 */
async function batchRunning(ns, target, jobs) {
    return jobs.find(j => j.name.includes(target.target.host)) != undefined;
}

/**
 * @typedef target
 * @property {host} target
 * @property {number} ratio
 * @property {number} mem
 * @property {number} cores
 * 
 * @param {NS} ns
 * @param {object} knownBad
 * @returns {target[]}
 */
async function getTargets(ns, knownBad) {
    if (Object.keys(knownBad).length > 1) {
        Object.keys(knownBad).forEach(k => {
            knownBad[k]["age"] ||= 0;
            knownBad[k]["age"]++;
        });
        let oldest = Object.entries(knownBad).sort((a,b) => b[1].age - a[1].age)[0][0];
        ns.print(`Giving ${oldest} another chance`);
        delete knownBad[oldest];
    }
    let hs = hosts(ns).filter(h => h.root && h.max > 0 && !knownBad[h.host]);
    let sumMax = hs.reduce((t,h) => t+Number(h.max), 0);
    let bees = await hive.info(ns);
    let mem = bees.reduce((t,b) => t+b.maxRam, 0) - st.read("reserveHiveMem");
    await netLog(ns, "Found %d targets, %s total value, %s available", hs.length, fmt.money(sumMax), fmt.memory(mem));
    return hs.map(h => ({target: h, ratio: h.max/sumMax, mem: Math.floor(h.max/sumMax * mem), cores: Math.max(...bees.map(b => b.cores))}))
        .sort((a,b) => b.mem-a.mem);
}