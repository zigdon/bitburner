import * as fmt from "/lib/fmt.js";
import {log, loglvl, netLog} from "/lib/log.js";

var workers = new Map();
var targets = new Map();
var script = "/daemons/worker.js";
var reqVersion = 11;

var lastReport = Date.now();
var lastNetReport = Date.now() - 280000;
var debug = 0;

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("getServerSecurityLevel");
    ns.disableLog("getServerMaxRam");
    await init(ns);
    while (true) {
        var msg = await wait(ns);
        await process(ns, msg);
        await ns.sleep(100);
    }
}

/**
 * @param {NS} ns
 * @param {function(NS, {string}, ...any)}
 */
async function report(ns, f) {
    await f(ns, "====================== (%d targets)", targets.size);
    var lines = [];
    targets.forEach((t) => {
        lines.push(ns.sprintf("%s: %d weaken (%d->%d), %d grow (%s->%s), %d hack",
            t.host, t.weakenCount, t.curSec, t.minSec,
            t.growCount, fmt.int(t.curVal), fmt.int(t.maxVal), t.hackCount,
        ));
    })
    for (var l in lines) {
        await f(ns, lines[l]);
    }
}

/**
 *  @param {NS} ns 
 *  @param {string[]} ts
 **/
async function addTargets(ns, ts) {
    await netLog(ns, "adding targets: '%s'", ts);
    ts.forEach((target) => {
        targets.set(target, {
        host: target,
        weakenCount: 0,
        growCount: 0,
        hackCount: 0,
        minSec: ns.getServerMinSecurityLevel(target),
        maxVal: ns.getServerMaxMoney(target),
        curSec: ns.getServerSecurityLevel(target),
        curVal: ns.getServerMoneyAvailable(target),
    })});
}

/**
 *  @param {NS} ns 
 *  @param {string} path
 **/
async function saveTargets(ns, path) {
    var data = [];
    targets.forEach((t) => { data.push(t.host) });
    await ns.write(path, data.join(" "), "w");
    await netLog(ns, "Saved targets: %s", data);
}

/**
 *  @param {NS} ns 
 **/
async function init(ns) {
    var ts = [];
    ns.read("targets.txt").split(" ").forEach(function (target) {
        ts.push(target);
    });
    await addTargets(ns, ts);
    ts.forEach((target) => {
        updateTarget(target);
    })

    ns.clearPort(1);  // incoming
    ns.clearPort(2);  // outgoing
    await send(ns, "", "ping");
    await ns.sleep(8000);
    ns.clearPort(2);  // outgoing again
}

/**
 *  @param {NS} ns 
 *  @param {Object} msg
 *  @param {string} msg.host
 *  @param {string} msg.text
 **/
async function process(ns, msg) {
    var h;
    var words = msg.text.split(" ");
    if (workers.has(msg.host)) {
        loglvl(ns, 2, "found existing entry for %s", msg.host);
        h = workers.get(msg.host);
        h.lastSeen = Date.now();
    } else {
        loglvl(ns, 2, "creating entry for %s", msg.host);
        h = {
            host: msg.host,
            lastSeen: Date.now(),
            threads: 0,
            target: 0,
            mem: ns.getServerMaxRam(msg.host),
            cmd: "idle",
        };
        if (words[0] != "version") {
            workers.set(msg.host, h);
            await send(ns, msg.host, "ping");
            return;
        }
    }

    var threads = h.mem / ns.getScriptRam(script, msg.host);
    if (words[0] == "version") {
        if (words[1] != reqVersion) {
            await netLog(ns, "%s is running wrong version %d, restarting.", msg.host, reqVersion);
            ns.kill(script, msg.host);
            await ns.scp(script, "home", msg.host);
            ns.exec(script, msg.host, threads);
        }
        return;
    } else if (words[0] == "done") {
        h.target = "none";
        h.cmd = "idle";
        updateTarget(words[2]);
    } else if (words[0] == "idle") {
        loglvl(ns, 1, "%s is idle for %d seconds, uncloging...",
            msg.host, words[1]);
        if (await unclogFor(ns, msg.host)) {
            return;
        }
    } else if (words[0] != "ready") {
        await netLog(ns, "unknown message from %s: %s", msg.host, msg.text);
    }

    workers.set(msg.host, h);

    var inst = selectTarget(ns, threads);
    if (!inst) {
        await netLog(ns, "No targets, idling.");
        return;
    }

    h.cmd = inst.cmd;
    h.target = inst.host;
    h.threads = inst.threads;
    if (inst.threads) {
        await send(ns, msg.host, ns.sprintf("%s %s %d", inst.cmd, inst.host, inst.threads));
    } else {
        await send(ns, msg.host, ns.sprintf("%s %s", inst.cmd, inst.host));
    }
    workers.set(msg.host, h);
}
/**
 *  @param {NS} ns 
 *  @param {string} host
 **/
async function unclogFor(ns, host) {
    loglvl(ns, 2, "starting unclog");
    var first = ns.peek(2);
    while (true) {
        var head = ns.peek(2);
        if (head == "NULL PORT DATA") {
            return false;
        } else if (head.startsWith(host)) {
            return true;
        }
        var msg = ns.readPort(2);
        if (msg == first) {
            return false;
        } else {
            await ns.writePort(2, msg);
        }
    }
}

function updateTarget(target) {
    if (!targets.has(target)) {
        return;
    }
    var t = targets.get(target);
    var w = 0;
    var g = 0;
    var h = 0;
    workers.forEach((v) => {
        if (v.target == target) {
            switch (v.cmd) {
                case "weaken":
                    if (v.threads) {
                        w += v.threads;
                    }
                    break;
                case "grow":
                    if (v.threads) {
                        g += v.threads;
                    }
                    break;
                case "hack":
                    if (v.threads) {
                        h += v.threads;
                    }
                    break;
            }
        }
    })
    t.weakenCount = w;
    t.growCount = g;
    t.hackCount = h;
    targets.set(target, t);
}

/**
 *  @param {NS} ns 
 *  @param {string} host
 *  @param {string} msg
 **/
async function send(ns, host, msg) {
    if (host != "") {
        loglvl(ns, 2, "sending '%s' to '%s'", msg, host);
        msg = ns.sprintf("%s: %d %s", host, Date.now(), msg);
    } else {
        loglvl(ns, 2, "sending '%s' to ALL", msg);
    }
    while (!await ns.tryWritePort(2, msg)) {
        loglvl(ns, 1, "outgoing queue full, retrying...");
        // check the head of the queue for obsolete messages
        var head = ns.peek(2);
        var words = head.split(" ");
        if (Date.now() - words[1] > 20000) {
            loglvl(ns, 1, "removing obsolete message '%s'", head);
            ns.readPort(2);
        }
        await ns.sleep(100);
    }
}

/**
 * @param {NS} ns
 */
async function checkControl(ns) {
    while (true) {
        var msg = await ns.readPort(3);
        if (msg == "NULL PORT DATA") {
            return;
        }
        var words = msg.split(" ");
        switch (words[0]) {
            case "target":
                if (words[1] == "add") {
                    await addTargets(ns, [words[2]]);
                } else if (words[1] == "del") {
                    await netLog(ns, "removing target '%s'", words[2]);
                    targets.delete(words[2]);
                }
                await saveTargets(ns, "targets.txt");
                break;
            case "ping":
                if (words[1]) {
                    await netLog(ns, "Sending a ping to %s", debug, words[1]);
                    await send(ns, words[1], "ping");
                } else {
                    await netLog(ns, "Sending a ping to ALL", debug);
                    await send(ns, "", "ping");
                }
                break;
            case "loglevel":
                await netLog(ns, "loglevel not implemented");
                loglvl(ns, 0, "Changing log level from %d to %d", debug, words[1]);
                debug = words[1];
                break;
            case "report":
                await report(ns, netLog);
                break;
            case "quit":
                ns.exit();
                break;
            default:
                await netLog(ns, "Unknown control command: '%s'", msg);
        }
    }
}

/**
 * @param {NS} ns
 */
async function wait(ns) {
    loglvl(ns, 2, "waiting...");
    while (true) {
        await checkControl(ns);
        if (Date.now() - lastReport > 10000) {
            lastReport = Date.now();
            await report(ns, log);
        }
        if (Date.now() - lastNetReport > 300000) {
            lastNetReport = Date.now();
            await report(ns, netLog);
        }
        var msg = await ns.readPort(1);
        if (msg == "NULL PORT DATA") {
            await ns.sleep(100);
            continue;
        }
        loglvl(ns, 2, "read: '%s'", msg);
        var data = msg.split(": ", 2);
        return { host: data[0], text: data[1] };
    }
}

/**
 * @param {NS} ns
 * @param {int} threads
 */
function selectTarget(ns, threads) {
    if (targets.size == 0) {
        return;
    }
    var fewest = 0;
    var target = "";
    var cmd = "hack";

    targets.forEach(function (t) {
        t.curSec = ns.getServerSecurityLevel(t.host);
        t.curVal = ns.getServerMoneyAvailable(t.host);
        targets.set(t.host, t);

        // If the numbers aren't where we want them, we need to adjust.
        // But we don't want to have too many workers on any given task.
        // So:
        // - each weaken reduces sec by 0.05 - if we have enough already
        // running, don't bother adding more.
        // - pretend that every grow call increases the value by 0.7%
        var ratio = t.curVal / t.maxVal;
        var secGap = t.curSec - t.minSec;
        loglvl(ns, 2, "%s ratio: %.2f, count: %d", t.host, ratio, t.growCount);
        loglvl(ns, 2, "%s secGap: %d, count: %d", t.host, secGap, t.weakenCount);
        if (secGap > 50 && (secGap - 50) / 0.05 > t.weakenCount) {
            if (t.weakenCount < fewest || fewest == 0) {
                cmd = "weaken";
                target = t.host;
                fewest = t.weakenCount + threads;
            }
        } else if (ratio < 0.75 && Math.log(0.75 - ratio) / Math.log(1.007) < t.growCount) {
            if (t.growCount < fewest || fewest == 0) {
                cmd = "grow";
                target = t.host;
                fewest = t.growCount + threads;
            }
        } else if (secGap > 5 && (secGap - 5) / 0.05 > t.weakenCount) {
            if (t.weakenCount < fewest || fewest == 0) {
                cmd = "weaken";
                target = t.host;
                fewest = t.weakenCount + threads;
            }
        } else if (t.curSec < 50 && (t.hackCount < fewest || fewest == 0)) {
            cmd = "hack";
            target = t.host;
            fewest = t.hackCount + threads;
        } else if (fewest == 0) {
            cmd = "weaken";
            target = t.host;
            fewest = 999999;
        }
    })

    var t = targets.get(target);
    switch (cmd) {
        case "weaken":
            t.weakenCount += threads;
            loglvl(ns, 1, "weaken: +%d threads = %d; sec: %.2f -> %.2f",
                threads, t.weakenCount, t.curSec, t.minSec);
            break;
        case "grow":
            t.growCount += threads;
            loglvl(ns, 1, "grow: +%d threads = %d; val: %s -> %s",
                threads, t.growCount, fmt.int(t.curVal), fmt.int(t.maxVal));
            break;
        case "hack":
            t.hackCount += threads;
            loglvl(ns, 1, "hack: +%d threads = %d", threads, t.hackCount);
            break;
    }
    targets.set(target, t);

    return { cmd: cmd, host: target };
}