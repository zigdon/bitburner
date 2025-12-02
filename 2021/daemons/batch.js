import * as fmt from "/lib/fmt.js";
import { batchReport, log, netLog } from "/lib/log.js";

let wScript = "/bin/weaken.js";
let gScript = "/bin/grow.js";
let hScript = "/bin/hack.js";
let minGap = 250;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("getServerUsedRam");
    let flags = ns.flags([
        ["single", false],
    ])
    let target = ns.args[0];
    let reserve = ns.args[1];
    reserve = parseMemory(reserve);
    if (reserve) {
        await log(ns, "Reserving %s GB", fmt.int(reserve));
    } else {
        reserve = 0;
    }

    // If we have an obsolete marker, just quit
    if (ns.fileExists("/obsolete.txt")) {
        await netLog(ns, "Server obsolete, quitting.");
        ns.exit();
    }

    // Wait a random pause at startup, to avoid thundering on reboot
    let pause = 1000 + Math.random() * 9000;
    await netLog(ns, "[%s] Starting up batcher, sleeping for %.2fs", target, pause / 1000);
    await batchReport(ns, target, "batch", 0);
    await ns.sleep(pause);

    // 1. Get server to max value, min secutiry
    // 2. Start a weaken to undo hack damage
    // 3. Wait 1s, Start a weaken to undo grow damage
    // 4. Start a grow to end after the weaken (#3)
    // 5. Start a hack to end after the weaken (#2)

    let hostname = ns.getHostname();
    let hRam = ns.getScriptRam(hScript);
    let gRam = ns.getScriptRam(gScript);
    let wRam = ns.getScriptRam(wScript);
    let scriptRam = ns.getScriptRam(ns.getScriptName());
    let maxRam = ns.getServerMaxRam(hostname);
    let availRam = maxRam - scriptRam - reserve;
    let maxW = Math.floor((maxRam - scriptRam) / wRam);
    let maxG = Math.floor((maxRam - scriptRam) / gRam);
    let hackTime = ns.getHackTime(target);

    // If something else is running on the machine, wait for it to end.
    await netLog(ns, "[%s] Script needs %s GB, reserve %s GB, total ram: %s GB.",
        target, fmt.int(scriptRam), fmt.int(reserve), fmt.int(maxRam));
    pause = 1000;
    while (availRam < maxRam - scriptRam - reserve - 2) {
        await netLog(ns, "[%s] Unexpected memory use, waiting %s: %s/%s (%s)",
            target, fmt.time(pause), fmt.int(availRam), fmt.int(maxRam - scriptRam - reserve - 2),
            fmt.int(maxRam - availRam - scriptRam - reserve - 2));
        await ns.sleep(pause);
        availRam = maxRam - ns.getServerUsedRam(hostname);
        if (pause < 60000) {
            pause *= 2;
        }
    }

    let atSec = false;
    let atVal = false;
    while (!atSec || !atVal) {
        atSec = await getToMinSec(ns, target, maxW);
        atVal = await getToMaxVal(ns, target, maxG);
    }

    let threads;
    let batches;
    while (true) {
        // Update to make sure we have the latest memory numbers (things change!)
        let maxRam = ns.getServerMaxRam(hostname);
        let availRam = maxRam - scriptRam - reserve;
        let maxW = Math.floor((maxRam - scriptRam) / wRam);
        let maxG = Math.floor((maxRam - scriptRam) / gRam);
        
        let schedule;
        [schedule, batches, threads] = await designBatch(ns, target, availRam, hRam, gRam, wRam, batches, threads);
        if (!schedule) {
            ns.tprintf("Can't figure out batches on %s for %s", hostname, target);
            break;
        }

        await runBatch(ns, Date.now() + schedule[0].time, target, schedule);

        if (flags.single) { break }

        log(ns, "Waiting %s before starting another set...", fmt.time(hackTime + 10000));
        await ns.sleep(hackTime + 10000);

        if ((ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 5) ||
            (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target) * 0.90)) {
            await netLog(ns, "Resetting before starting new batch");
            atSec = false;
            atVal = false;
            while (!atSec || !atVal) {
                atSec = await getToMinSec(ns, target, maxW);
                atVal = await getToMaxVal(ns, target, maxG);
            }
        }
    }
}

/**
 * @param {NS} ns
 * @param {number} start
 * @param {string} target
 * @param {Object[]} schedule
 */
async function runBatch(ns, start, target, schedule) {
    let hostname = ns.getHostname();
    for (let i = 0; i < schedule.length; i++) {
        await ns.sleep(10);
        let s = schedule[i];
        if (Date.now() < start + s.time) {
            await ns.sleep(start + s.time - Date.now());
        }
        log(ns, "Launching %s for batch #%d (%dms off)", s.proc, s.batch, Date.now() - (start + s.time));
        let t = s.threads;
        while (t > 0 && !ns.exec(s.proc, hostname, t, target, "--eta", start + s.end, "--delta", s.time)) {
            t--;
        }
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
async function getThreads(ns, target, availRam, hRam, gRam, wRam) {
    let targetHack = 90;
    let growThreads;
    let hackThreads;
    let weakHackThreads;
    let weakGrowThreads;
    let reqRam;
    let maxVal = ns.getServerMaxMoney(target);
    while (targetHack > 0) {
        growThreads = await threadsForGrow(ns, target, 100 / (100 - targetHack));
        hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, maxVal * targetHack / 100));
        let secHackDmg = ns.hackAnalyzeSecurity(hackThreads);
        weakHackThreads = Math.ceil(getWeakThreads(ns, secHackDmg));
        let secGrowDmg = ns.growthAnalyzeSecurity(growThreads);
        weakGrowThreads = Math.ceil(getWeakThreads(ns, secGrowDmg));
        reqRam = growThreads * gRam + hackThreads * hRam + (weakHackThreads + weakGrowThreads) * wRam;

        if (reqRam < availRam && growThreads * hackThreads * weakHackThreads * weakGrowThreads > 0) {
            break;
        }
        if (targetHack > 5) {
            targetHack -= 5;
        } else {
            targetHack--;
        }
        await ns.sleep(10);
    }
    if (targetHack == 0) {
        await netLog(ns, "[%s] giving up", target);
        return false;
    }
    log(ns, "[%s] hacking %d%%, with %d/%d/%d/%d threads, using %s out of %s", target,
        targetHack, hackThreads, weakHackThreads, growThreads, weakGrowThreads, fmt.memory(reqRam), fmt.memory(availRam));
    return { gt: growThreads, ht: hackThreads, wht: weakHackThreads, wgt: weakGrowThreads };
}

/**
 * @param {NS} ns
 * @param {number} dmg
 */
function getWeakThreads(ns, dmg) {
    let i = 0;
    let got = 0;
    while (got < dmg) {
        i++;
        got = ns.weakenAnalyze(i);
    }

    return i;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} threads
 */
async function getToMaxVal(ns, target, threads) {
    let maxVal = ns.getServerMaxMoney(target);
    let curVal = ns.getServerMoneyAvailable(target);
    let hostname = ns.getHostname();
    log(ns, "getting %s val: %s -> %s", target, fmt.int(curVal), fmt.int(maxVal));
    let ratio = 1000;
    if (curVal > 0) {
        ratio = maxVal / curVal;
    }

    if (ratio < 1.01) {
        log(ns, "Got to max value %s", fmt.int(maxVal));
        return true;
    }

    let gn = await threadsForGrow(ns, target, ratio);
    if (gn > threads) {
        await netLog(ns, "[%s] Too many threads, want %s, can only run %s", target, fmt.int(gn), fmt.int(threads));
        gn = threads;
    }
    let wait = ns.getGrowTime(target);
    await netLog(ns, "[%s] grow will take %s. Running %s threads on %s.", target,
        fmt.time(wait), fmt.int(gn), hostname);
    let pid = 0;
    while (pid == 0 && gn > 0) {
        pid = ns.exec(gScript, hostname, gn, target);
        gn--;
        await ns.sleep(100);
    }
    if (pid == 0) {
        await netLog(ns, "[%s] Failed to launch grow!", target);
        return false;
    }
    await ns.sleep(wait + 500);
    if (ns.scriptRunning(gScript, hostname)) {
        await netLog(ns, "[%s] grow still running!", target);
    }
    return false;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} threads
 */
async function getToMinSec(ns, target, threads) {
    let minSec = ns.getServerMinSecurityLevel(target);
    let curSec = ns.getServerSecurityLevel(target);
    let hostname = ns.getHostname();
    log(ns, "getting %s sec: %.3f -> %.3f", target, curSec, minSec);
    let need = curSec - minSec;
    if (need <= 1) {
        log(ns, "Got to min security %d", minSec);
        return true;
    }

    let wn = await threadsForWeaken(ns, need, threads);
    let wait = ns.getWeakenTime(target);
    await netLog(ns, "[%s] weaken will take %s", target, fmt.time(wait));
    let pid = 0;
    while (pid == 0 && wn > 0) {
        pid = ns.exec(wScript, hostname, wn, target);
        wn--;
        await ns.sleep(100);
    }
    if (pid == 0) {
        await netLog(ns, "[%s] failed to launch weaken!", target);
        return false;
    }
    await ns.sleep(wait + 500);
    if (ns.scriptRunning(wScript, hostname)) {
        await netLog(ns, "[%s] weaken still running!", target);
    }
    return false;
}

/**
 * @param {NS} ns
 * @param {number} target
 * @param {number} max
 */
async function threadsForGrow(ns, target, need) {
    let got = Math.ceil(ns.growthAnalyze(target, need));
    // await netLog(ns, "growing with %d threads to gain %.2f", got, need);
    return got;
}

/**
 * @param {NS} ns
 * @param {number} target
 * @param {number} max
 */
async function threadsForWeaken(ns, target, max) {
    let n = 1;
    while (n < max) {
        let got = ns.weakenAnalyze(n);
        if (got > target) {
            await netLog(ns, "weakening with %d threads: %.2f", n, got);
            return n;
        }
        n++;
        await ns.sleep(100);
    }
    await netLog(ns, "Not enough threads to weaken by %.2f, returning %d", target, max);
    return max;
}

function parseMemory(n) {
    if (n == Number(n)) {
        return n;
    }
    if (!n) {
        return 0;
    }
    let unit = n.substring(n.length - 2);
    n = n.substring(0, n.length - 2);
    switch (unit) {
        case "pb":
            n *= 1000;
        case "tb":
            n *= 1000;
        default:
            n *= 1;
    }

    return n;
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {number} availRam
 * @param {number} hRam
 * @param {number} gRam
 * @param {number} wRam
 * @param {number} batches
 * @param {object} threads
 */
async function designBatch(ns, target, availRam, hRam, gRam, wRam, batches, threads) {
    let weakTime = ns.getWeakenTime(target);
    let hackTime = ns.getHackTime(target);
    let growTime = ns.getGrowTime(target);
    let maxVal = ns.getServerMaxMoney(target);

    batches ||= 0;
    if (!threads) {
        await netLog(ns, "Attempting to solve with a max of %d batches", fmt.int(hackTime / (5 * minGap)));
        while (batches < hackTime / (5 * minGap)) {
            batches++;
            await ns.sleep(10);
            if (threads && (threads.gt * gRam + (threads.wgt + threads.wht) * wRam + threads.ht * hRam) < availRam / (batches+1)) {
                continue;
            }
            let solution = await getThreads(ns, target, Math.floor(availRam / batches+1), hRam, gRam, wRam);
            if (solution) {
                threads = solution;
                continue;
            }
            break;
        }
        if (!threads) {
            return [null, null, null];
        }
    }
    await netLog(ns, "[%s] using %d growth threads to recover from hacking with %d threads", target, threads.gt, threads.ht);
    await netLog(ns, "[%s] using %d weaken threads to recover from hack security damage", target, threads.wht);
    await netLog(ns, "[%s] using %d weaken threads to recover from grow security damage", target, threads.wgt);
    await netLog(ns, "[%s] each hack yields $%s", target, fmt.int(ns.hackAnalyze(target) * threads.ht * maxVal));

    let gap = hackTime / batches / 5;
    if (gap < minGap) {
        gap = minGap;
    }
    await netLog(ns, "[%s] Running %d batches of %s each (1 hack = %s, gap = %.2fs) with %s GB", target,
        batches, fmt.time(gap * 6), fmt.time(hackTime), gap / 1000, fmt.int(availRam));

    let schedule = [];
    let addBatch = function (i) {
        let base = weakTime + gap * 3;
        let t = (i - 1) * gap * 6;
        schedule.push({ time: base + t - hackTime, proc: hScript, threads: threads.ht, batch: i, end: base + t });
        t += gap;
        schedule.push({ time: base + t - weakTime, proc: wScript, threads: threads.wht, batch: i, end: base + t });
        t += gap;
        schedule.push({ time: base + t - growTime, proc: gScript, threads: threads.gt, batch: i, end: base + t });
        t += gap;
        schedule.push({ time: base + t - weakTime, proc: wScript, threads: threads.wgt, batch: i, end: base + t });
    }

    for (let i = 1; i <= batches; i++) {
        await ns.sleep(100);
        addBatch(i)
    }
    schedule = schedule.sort((a, b) => {
        return a.time - b.time;
    })

    // Count threads
    let totals = new Map();
    schedule.forEach((step) => {
        if (!totals.has(step.proc)) {
            totals.set(step.proc, 0);
        }
        totals.set(step.proc, totals.get(step.proc) + step.threads);
    })

    let sched = [];
    schedule.forEach((s) => {
        sched.push(ns.sprintf("%3.2fs: (%2d) run %s with %s threads", s.time, s.batch, s.proc, fmt.int(s.threads)));
    })
    for (let m in sched) {
        await log(ns, "[%s] %s", target, sched[m]);
        await ns.sleep(100);
    }
    await netLog(ns, "[%s] Total threads:", target);
    await netLog(ns, "[%s]   grow: %d (%s)", target, totals.get(gScript), fmt.memory(totals.get(gScript) * gRam));
    await netLog(ns, "[%s]   weak: %d (%s)", target, totals.get(wScript), fmt.memory(totals.get(wScript) * wRam));
    await netLog(ns, "[%s]   hack: %d (%s)", target, totals.get(hScript), fmt.memory(totals.get(hScript) * hRam));
    await netLog(ns, "[%s] Total RAM: %s (of %s)", target,
        fmt.memory(totals.get(gScript) * gRam + totals.get(wScript) * wRam + totals.get(hScript) * hRam),
        fmt.memory(availRam));

    return [schedule, batches, threads];
}