import * as fmt from "lib/fmt.js";
var wScript = "weaken.js";
var gScript = "grow.js";
var hScript = "hack.js";
var hostname;

/** @param {NS} ns **/
export async function main(ns) {
    // 1. Get server to max value, min secutiry
    // 2. Start a weaken to undo hack damage
    // 3. Wait 1s, Start a weaken to undo grow damage
    // 4. Start a grow to end after the weaken (#3)
    // 5. Start a hack to end after the weaken (#2)

    var target = ns.args[0];
    hostname = ns.getHostname();
    var maxRam = ns.getServerMaxRam(hostname);
    var maxVal = ns.getServerMaxMoney(target);
    var hRam = ns.getScriptRam(hScript);
    var gRam = ns.getScriptRam(gScript);
    var wRam = ns.getScriptRam(wScript);
    var availRam = maxRam - ns.getServerUsedRam(hostname);
    var maxW = Math.floor(availRam / wRam);
    var maxG = Math.floor(availRam / gRam);
    var maxH = Math.floor(availRam / hRam);
    var atSec = false;
    var atVal = false;
    while (!atSec || !atVal) {
        atSec = await getToMinSec(ns, target, maxW);
        atVal = await getToMaxVal(ns, target, maxG);
    }

    var weakTime = ns.getWeakenTime(target);
    var hackTime = ns.getHackTime(target);
    var growTime = ns.getGrowTime(target);

    var batches = 1;
    var threads;
    while (batches < 100) {
        var solution = getThreads(ns, target, availRam/batches, hRam, gRam, wRam);
        if (!solution) {
            break
        }
        threads = solution;
        batches++;
    }
    ns.tprintf("using %d growth threads to recover from hacking with %d threads",
        threads.gt, threads.ht);
    ns.tprintf("using %d weaken threads to recover from hack security damage", threads.wht);
    ns.tprintf("using %d weaken threads to recover from grow security damage", threads.wgt);
    ns.tprintf("each hack yields $%s", fmt.int(ns.hackAnalyze(target)*threads.ht*maxVal));

    var gap = hackTime/batches/5;
    ns.tprintf("Running %d batches of %s each (1 hack = %s, gap = %.2fs) with %s GB",
        batches, fmt.time(gap*6), fmt.time(hackTime), gap/1000, fmt.int(availRam));

    var schedule = [];
    var addBatch = function(i) {
        var base = weakTime + gap * 3;
        var t = (i-1) * gap * 6;
        schedule.push({time: base+t-hackTime, proc: hScript, threads: threads.ht, batch: i, sleep: 0});
        t += gap;
        schedule.push({time: base+t-weakTime, proc: wScript, threads: threads.wht, batch: i, sleep: 0});
        t += gap;
        schedule.push({time: base+t-growTime, proc: gScript, threads: threads.gt, batch: i, sleep: 0});
        t += gap;
        schedule.push({time: base+t-weakTime, proc: wScript, threads: threads.wgt, batch: i, sleep: 0});
    }
    
    for (var i=1; i<=batches; i++) {
        addBatch(i)
    }
    schedule = schedule.sort((a,b) => {
        return a.time-b.time;
    })

    // Fill out how long a sleep between steps
    var totals = new Map();
    schedule = schedule.map((step, i, sched) => {
        if (!totals.has(step.proc)) {
            totals.set(step.proc, 0);
        }
        totals.set(step.proc, totals.get(step.proc) + step.threads);

        if (i == 0) { return step }
        step.sleep = step.time - sched[i-1].time;
        return step;
    })
    
    schedule.forEach((s) => {
        var sleep = 0;
        if (s.sleep) {
            sleep = s.sleep;
        }
        ns.tprintf("%3.2fs: (%2d) sleep for %.2fs", s.time/1000, s.batch, sleep/1000);
        ns.tprintf("%3.2fs: (%2d) run %s with %s threads", (s.time+sleep)/1000, s.batch, s.proc, fmt.int(s.threads))
    })
    ns.tprintf("Total threads:");
    ns.tprintf("  grow: %d (%s GB)", totals.get(gScript), fmt.int(totals.get(gScript) * gRam));
    ns.tprintf("  weak: %d (%s GB)", totals.get(wScript), fmt.int(totals.get(wScript) * wRam));
    ns.tprintf("  hack: %d (%s GB)", totals.get(hScript), fmt.int(totals.get(hScript) * hRam));
    ns.tprintf("Total RAM: %s GB",
       fmt.int(totals.get(gScript) * gRam + totals.get(wScript) * wRam + totals.get(hScript) * hRam));

    while(true) {
        await runBatch(schedule);
        ns.tprintf("Waiting %s before starting another set...", fmt.time(hackTime));
        await ns.sleep(hackTime);
    }
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {Object[]} schedule
 */
async function runBatch(ns, target, schedule) {
    for (var i=0; i<schedule.length; i++) {
        var s = schedule[i];
        if (s.sleep) {
            await ns.sleep(s.sleep);
        }
        ns.print(ns.sprintf("Launching %s for batch #%d", s.proc, s.batch));
        ns.exec(s.proc, hostname, s.threads, target, s.time);
    }
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} availRam
 * @param {number} hRam
 * @param {number} gRam
 * @param {number} wRam
 */
function getThreads(ns, target, availRam, hRam, gRam, wRam) {
    var targetHack = 90;
    var growThreads;
    var hackThreads;
    var weakHackThreads;
    var weakGrowThreads;
    var maxVal = ns.getServerMaxMoney(target);
    while (targetHack > 0) {
        growThreads = threadsForGrow(ns, target, 100/(100-targetHack));
        hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, maxVal * targetHack / 100));
        var secHackDmg = ns.hackAnalyzeSecurity(hackThreads);
        weakHackThreads = Math.ceil(getWeakThreads(ns, secHackDmg));
        var secGrowDmg = ns.growthAnalyzeSecurity(growThreads);
        weakGrowThreads = Math.ceil(getWeakThreads(ns, secGrowDmg));
        var reqRam = growThreads*gRam + hackThreads*hRam + (weakHackThreads+weakGrowThreads)*wRam;

        // ns.tprintf("considering hacking %d%%, with %d/%d/%d/%d threads, using %s GB out of %s GB",
        //    targetHack, hackThreads, weakHackThreads, growThreads, weakGrowThreads, fmt.int(reqRam), fmt.int(availRam));
        if (reqRam < availRam) {
            break;
        }
        targetHack -= 5;
    }
    if (targetHack == 0) {
        return false;
    }
    return {gt: growThreads, ht: hackThreads, wht: weakHackThreads, wgt: weakGrowThreads};
}

/**
 * @param {NS} ns
 * @param {number} dmg
 */
function getWeakThreads(ns, dmg) {
    var i = 0;
    var got = 0;
    while (got < dmg) {
        i++;
        got = ns.weakenAnalyze(i);
    }

    return i;
}
/**
 * @param {NS} ns
 * @param {string} target
 */
function reportNumbers(ns, target) {
    var curVal = ns.getServerMoneyAvailable(target);
    var curSec = ns.getServerSecurityLevel(target);
    ns.tprintf("Current values: sec: %.3f, val: $%s", curSec, fmt.int(curVal));
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} threads
 */
async function getToMaxVal(ns, target, threads) {
    var maxVal = ns.getServerMaxMoney(target);
    var curVal = ns.getServerMoneyAvailable(target);
    ns.tprintf("getting %s val: %s -> %s", target, fmt.int(curVal), fmt.int(maxVal));
    var need = maxVal - curVal;
    if (need <= 0) {
        ns.tprintf("Got to max value %s", fmt.int(maxVal));
        return true;
    }

    var gn = threadsForGrow(ns, target, 1 + need/maxVal);
    if (gn > threads) {
        ns.tprintf("Too many threads, want %s, can only run %s", fmt.int(gn), fmt.int(threads));
        gn = threads;
    }
    var wait = ns.getGrowTime(target);
    ns.tprintf("grow will take %s. Running %s threads on %s.", fmt.time(wait), fmt.int(gn), hostname);
    var pid = ns.exec(gScript, hostname, gn, target);
    if (pid == 0) {
        ns.tprintf("Failed to launch grow!");
        return false;
    }
    await ns.sleep(wait+500);
    if (ns.scriptRunning(gScript, hostname)) {
        ns.tprintf("grow still running!");
    }
    return false;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} threads
 */
async function getToMinSec(ns, target, threads) {
    var minSec = ns.getServerMinSecurityLevel(target);
    var curSec = ns.getServerSecurityLevel(target);
    ns.tprintf("getting %s sec: %.3f -> %.3f", target, curSec, minSec);
    var need = curSec-minSec;
    if (need <= 0) {
        ns.tprintf("Got to min security %d", minSec);
        return true;
    }

    var wn = threadsForWeaken(ns, need, threads);
    var wait = ns.getWeakenTime(target);
    ns.tprintf("weaken will take %s", fmt.time(wait));
    var pid = ns.exec(wScript, hostname, wn, target);
    if (pid == 0) {
        ns.tprintf("failed to launch weaken!");
        return false;
    }
    await ns.sleep(wait + 500);
    if (ns.scriptRunning(wScript, hostname)) {
        ns.tprintf("weaken still running!");
    }
    return false;
}

/**
 * @param {NS} ns
 * @param {number} target
 * @param {number} max
 */
function threadsForGrow(ns, target, need) {
    var got = Math.ceil(ns.growthAnalyze(target, need));
    // ns.tprintf("growing with %d threads to gain %.2f", got, need);
    return got;
}

/**
 * @param {NS} ns
 * @param {number} target
 * @param {number} max
 */
function threadsForWeaken(ns, target, max) {
    var n = 1;
    while (n < max) {
        var got = ns.weakenAnalyze(n);
        if (got > target) {
            ns.tprintf("weakening with %d threads: %.2f", n, got);
            return n;
        }
        n++;
    }
    ns.tprintf("Not enough threads to weaken by %.2f, returning %d", target, max);
    return max;
}

    /* proof of concept of a single batch
    reportNumbers(ns, target);
    for (var i=1; i<=batches; i++) {
        ns.tprintf("%d: Starting hack weaken", i);
        ns.exec(wScript, hostname, threads.wht, target);
        ns.tprintf("%d: Waiting %s, then starting grow weaken", i, gap*2);
        await ns.sleep(gap*2);
        ns.exec(wScript, hostname, threads.wgt, target);
        ns.tprintf("%d: Waiting %s, then starting grow", i, fmt.time(weakTime-growTime-gap));
        await ns.sleep(weakTime-growTime-gap);
        ns.exec(gScript, hostname, threads.gt, target);
        ns.tprintf("%d: Waiting %s, then starting hack", i, fmt.time(growTime-hackTime-gap*2));
        await ns.sleep(growTime-hackTime-gap*2);
        ns.exec(hScript, hostname, threads.ht, target);
        await ns.sleep(gap);
        reportNumbers(ns, target);
    }
    */