import {batchReport, netLog, log} from "/lib/log.js";
import * as fmt from "/lib/fmt.js";

/**
 * @param {NS} ns
 * @param {number} startTS
 */
export async function delay(ns, startTS) {
    if (startTS - Date.now() > 1000) {
       await ns.sleep(startTS - Date.now() - 800);
    }
    while (startTS - Date.now() > 10) {
        await ns.sleep(10);
    }
    return;
}

/**
 * @param {NS} ns
 * @param {function} f
 * @param {string} target
 * @param {string} name
 * @param {number} eta
 * @param {number} delta
 */
export async function execCmd(ns, f, target, name, eta, delta) {
    let start = Date.now();
    let etaStr = new Date();
    etaStr.setTime(start+eta);
    await log(ns, "Starting %s, estimated %s, ETA: %s",
        f.name, fmt.time(eta), etaStr.toLocaleTimeString("en-US", { timeZone: "PST" }));
    let res = await f(target);
    let now = Date.now();
    let elapsed = now-start;
    if (eta && Math.abs(eta-now > 250)) {
        await netLog(ns, "bad %s estimate for %s: off by %s",
            name, target, fmt.time(Math.abs(eta-elapsed), {digits: 2})
        );
    }
    if (delta && Math.abs(delta-elapsed > 250)) {
        await netLog(ns, "bad %s delta for %s: wanted %s, took %s (%s)",
            name, target, fmt.time(delta), fmt.time(elapsed), fmt.time(Math.abs(delta-elapsed), {digits: 2})
        );
    }
    await netLog(ns, "%s %s finished, by %s, took %s", target, name, res, fmt.time(Date.now()-start));
    await batchReport(ns, target, name, res);
}

/**
 * @param {NS} ns
 * @param {string} worker
 * @param {string} target
 * @param {object} sMem
 */
export async function getToMinSec(ns, worker, target, sMem) {
    // Weaken to min
    let curSec = ns.getServerSecurityLevel(target);
    let minSec = ns.getServerMinSecurityLevel(target);
    await netLog(ns, "Getting %s to minsec: %d -> %d", target, curSec, minSec);
    let server = ns.getServer(target);
    while (curSec > minSec) {
        await ns.sleep(1);
        let mem = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker) - 200;
        let t = Math.floor(mem / sMem["weaken"]);
        if (t == 0) {
            await netLog(ns, "Can't run weaken!");
            return null;
        }
        await netLog(ns, `${target} needs weakening: ${curSec} -> ${minSec}, running ${t} threads`);
        await netLog(ns, `Weaken takes ${fmt.time(ns.formulas.hacking.weakenTime(server, ns.getPlayer()))}`);
        let pid = ns.exec("/bin/weaken.js", worker, t, target);
        if (pid == 0) {
            await netLog(ns, "Can't launch weaken!");
            break;
        }
        while (ns.isRunning(pid, worker)) {
            await ns.sleep(100);
        }
        curSec = ns.getServerSecurityLevel(target);
        minSec = ns.getServerMinSecurityLevel(target);
    }

    return true;
}

/**
 * @param {NS} ns
 * @param {string} worker
 * @param {string} target
 * @param {object} sMem
 */
export async function getToMaxVal(ns, worker, target, sMem) {
    // Grow to max
    let curVal = ns.getServerMoneyAvailable(target);
    let maxVal = ns.getServerMaxMoney(target);
    await netLog(ns, "Getting %s to maxval: %d -> %d", target, curVal, maxVal);
    let server = ns.getServer(target);
    while (curVal < maxVal) {
        await ns.sleep(1);
        let mem = ns.getServerMaxRam(worker) - ns.getServerUsedRam(worker);
        let t = Math.floor(mem / sMem["grow"]);
        if (t == 0) {
            await netLog(ns, "Can't run grow!");
            return null;
        }
        await netLog(ns, `${target} needs growing: ${curVal} -> ${maxVal}, running ${t} threads`);
        await netLog(ns, `Grow takes ${fmt.time(ns.formulas.hacking.growTime(server, ns.getPlayer()))}`);
        let pid = ns.exec("/bin/grow.js", worker, t, target);
        if (pid == 0) {
            await netLog(ns, "Can't launch grow!");
            break;
        }
        while (ns.isRunning(pid, worker)) {
            await ns.sleep(100);
        }
        curVal = ns.getServerMoneyAvailable(target);
        maxVal = ns.getServerMaxMoney(target);
    }

    return true;
}

/**
 * @param {NS} ns
 * @param {number} gap
 * @param {number} memory
 * @param {number} cores
 * @param {string} target
 * @returns {batchIndex[]}
 */
export async function planBatch(ns, gap, memory, cores, target) {
    const sMem = {
        "weaken": ns.getScriptRam("/bin/weaken.js"),
        "grow": ns.getScriptRam("/bin/grow.js"),
        "hack": ns.getScriptRam("/bin/hack.js"),
    }

    // Figure out how much to hack, how many batches
    // - hack amount affects how much memory each batch uses
    // - that memory defines how many batches we can run in a cycle
    let batchMap = await batchIndex(ns, target, gap, sMem, memory, cores);

    // Pick the option with the highest overall value
    if (batchMap) {
        batchMap.sort((a,b) => b.rate-a.rate);
    }
    return batchMap;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} gap
 * @param {object} sMem
 * @param {number} memory
 * @param {number} cores
 * @returns {batchIndex[]}
 */
export async function batchIndex(ns, target, gap, sMem, memory, cores) {
    await netLog(ns, "Indexing batching options for hacking %s with %s and %d cores",
        target, fmt.memory(memory), cores);
    let res = [];
    let hackPct = 1;
    let maxVal = ns.getServerMaxMoney(target);
    while (hackPct < 100) {
        await ns.sleep(1);
        let opts = {
            threads: {},
            mem: sMem,
            time: {
                gap: gap,
            },
        };

        // Get the hack threads needed for this % of loot
        opts.threads["hack"] = Math.ceil(ns.hackAnalyzeThreads(target, maxVal * hackPct / 100));
        if (opts.threads["hack"] == -1) {
            break;
        }

        // Get the weaken threads we need to recover from the hack above
        let hDmg = ns.hackAnalyzeSecurity(opts.threads["hack"]);
        opts.threads["hackWeaken"] = 1;
        while (ns.weakenAnalyze(opts.threads["hackWeaken"], cores) < hDmg) {
            opts.threads["hackWeaken"]++;
        }

        // Get the grow threads needed to get back to 100%
        opts.threads["grow"] = Math.ceil(ns.growthAnalyze(target, 100 / (100-hackPct), cores));

        // And the weaken threads to recover from all this growth
        let gDmg = ns.growthAnalyzeSecurity(opts.threads["grow"]);
        opts.threads["growWeaken"] = 1;
        while (ns.weakenAnalyze(opts.threads["growWeaken"], cores) < gDmg) {
            opts.threads["growWeaken"]++;
        }

        // Figure out how much memory this batch takes
        let batchMem = opts.threads["hack"] * opts.mem["hack"]
            + opts.threads["grow"] * opts.mem["grow"]
            + (opts.threads["hackWeaken"] + opts.threads["growWeaken"]) * opts.mem["weaken"];

        // How many batches can we fit in the memory provided
        let batches = Math.floor(memory / batchMem);

        /*
        ns.print([
            `${hackPct}%: `,
            `${opts.threads["hack"]}/`,
            `${opts.threads["hackWeaken"]}/`,
            `${opts.threads["grow"]}/`,
            `${opts.threads["growWeaken"]} -> `,
            `${fmt.memory(batchMem)} -> `,
            `${batches} batches`].join(''));
        */

        // If we can't even have a single batch, we're done
        if (batches == 0) {
            await netLog(ns, "Couldn't find any more solutions for batching %d%% of %s with %s and %d cores",
                hackPct, target, fmt.memory(memory), cores);
            return res;
        }

        // Create the schedule. The goal is commands ends in order: H, W, G, W
        opts.time["weaken"] = Math.ceil(ns.getWeakenTime(target));
        opts.time["hack"] = Math.ceil(ns.getHackTime(target));
        opts.time["grow"] = Math.ceil(ns.getGrowTime(target));
        let schedule = [];
        for (let b=0; b < batches; b++) {
            schedule.push(...await addBatch(ns, schedule, b, opts))
        }
        schedule.sort((a,b) => a.ts-b.ts);
        // Adjust so that the schedule starts at 0
        let epoch = Math.min(...schedule.map(e => e.ts));
        schedule.forEach(e => e.ts -= epoch);
        let length = Math.max(...schedule.map(s => s.ts+s.eta));
        let value = hackPct * maxVal / 100 * batches;
        res[batches] = {
            target: target,
            batches: batches,
            memory: batchMem*batches,
            hackPct: hackPct,
            growThreads: opts.threads["grow"],
            weakenThreads: opts.threads["hackWeaken"] + opts.threads["growWeaken"],
            hackThreads: opts.threads["hack"],
            schedule: schedule,
            length: length,
            value: value,
            rate: value/length*1000,
        }
        hackPct++;
    }

    return res;
}

/**
 * @param {NS} ns
 * @param {schedule[]} schedule
 * @param {number} batchNum
 * @param {object} opts
 * @returns schedule[]
 */
async function addBatch(ns, schedule, batchNum, opts) {
    let nextEnd = schedule.length > 0 ? Math.max(...schedule.map(s => s.ts+s.eta)) + opts.time.gap : 0;
    let origEnd = nextEnd;
    let goodTime = (t) => {
        let step = schedule.sort((a,b) => a.ts+a.eta-b.ts-b.eta).find(s => s.ts+s.eta > t)
        return !step || step.proc != "weaken";
    }
    while (true) {
        let starts = Array(4)
            .map((_, n) => {
                let op = opts.time["weaken"];
                if (n % 4 == 0) { op = opts.time["hack"]; }
                if (n % 4 == 2) { op = opts.time["grow"]; }
                return n * opts.time.gap - op + nextEnd;
            })
        if (starts.every(ts => goodTime(ts))) { break }
        nextEnd++;
        await ns.sleep(1);
    }
    if (nextEnd != origEnd) {
        ns.print(`Delayed batch start by ${nextEnd-origEnd}, from ${fmt.time(origEnd)} to ${fmt.time(nextEnd)}`);
    }
    return [
        { ts: nextEnd + 0 * opts.time.gap - opts.time["hack"],
          threads: opts.threads["hack"],
          eta: opts.time["hack"], batchNum: batchNum, proc: "hack" },
        { ts: nextEnd + 1 * opts.time.gap - opts.time["weaken"],
          threads: opts.threads["hackWeaken"],
          eta: opts.time["weaken"], batchNum: batchNum, proc: "weaken" },
        { ts: nextEnd + 2 * opts.time.gap - opts.time["grow"],
          threads: opts.threads["grow"],
          eta: opts.time["grow"], batchNum: batchNum, proc: "grow" },
        { ts: nextEnd + 3 * opts.time.gap - opts.time["weaken"],
          threads: opts.threads["growWeaken"],
          eta: opts.time["weaken"], batchNum: batchNum, proc: "weaken" },
    ];
}

/**
 * @param {batchIndex[]} plans
 */
export function printPlans(plans) {
    let data = plans.filter(b => b)
        .map(b => [
            b.batches,
            b.hackPct,
            b.hackThreads,
            b.growThreads,
            b.weakenThreads,
            b.memory,
            b.length,
            b.value,
            b.rate,
        ]);
    return fmt.table(data, [
        "batches",
        "Pct",
        "hTrd",
        "gTrd",
        "wTrd",
        ["mem", fmt.memory],
        ["length", fmt.time],
        ["value", (n) => fmt.money(n, {digits:2})],
        ["rate", (n) => fmt.money(n, {digits:2})],
    ]);
}