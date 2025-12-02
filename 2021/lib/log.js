import { getPorts } from "/lib/ports.js";

var ports = getPorts();

function timestamp() {
    var now = new Date();
    return now.toLocaleTimeString("en-US", { timeZone: "PST" });
}

/**
 * @param {NS} ns
 */
function hostname(ns) {
    return "{" + ns.getHostname() + "} ";
}

/**
 * @param {NS} ns
 */
function proc(ns) {
    return "<" + ns.getScriptName() + "> ";
}

/**
 * @param {NS} ns
 * @param {string} target
 * @param {string} stage
 * @param {number} value
 */
export async function batchReport(ns, target, stage, value) {
    var startTime = Date.now();
    while (true) {
        if (await ns.tryWritePort(ports.BATCHMON,
            [Date.now(), hostname(ns), stage, target, value].join("\t"))) {
            return
        }
        await ns.sleep(100);
        if (Date.now() - startTime > 30000) {
            await netLog(ns, "Timeout writing batch report from %s", hostname(ns));
            return;
        }
    }
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function keep(ns, tmpl, ...args) {
    var script = ns.getScriptName().replace(/.*\//, "").replace(/\.[^.]+$/, "");
    var logFile = "/log/keep/" + script + ".txt";
    tmpl = timestamp() + " - " + proc(ns) + tmpl + "\n";
    await ns.write(logFile, ns.sprintf(tmpl, ...args), "a");
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export function log(ns, tmpl, ...args) {
    tmpl = timestamp() + " - " + tmpl;
    ns.print(ns.sprintf(tmpl, ...args));
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function send(ns, tmpl, ...args) {
    tmpl = timestamp() + " - " + hostname(ns) + proc(ns) + tmpl;
    var msg = ns.sprintf(tmpl, ...args);
    await ns.tryWritePort(5, msg);
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function console(ns, tmpl, ...args) {
    var name = proc(ns)
    name = name.substring(name.indexOf("/", 2) + 1)
    ns.tprintf(name + tmpl, ...args);
    log(ns, tmpl, ...args);
    await send(ns, tmpl, ...args);
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function netLog(ns, tmpl, ...args) {
    log(ns, tmpl, ...args);
    await send(ns, tmpl, ...args);
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function toast(ns, tmpl, ...args) {
    var opts = {level: "info", timeout: 5000};

    if (typeof(args[args.length-1]) == 'object') {
        var override = args.pop();
        if (override.level && ["success", "info", "warning", "error"].indexOf(override.level) == -1) {
            await console(ns, "Invalid toast call from %s, level '%s'", proc(ns), override.level)
            return;
        }
        opts.level = override.level || opts.level;
        opts.timeout = override.timeout == 0 ? null : override.timeout || opts.timeout;
    } 
    ns.toast(ns.sprintf(tmpl, ...args), opts.level, opts.timeout);
    await netLog(ns, tmpl, ...args);
}

/**
 * @param {NS} ns
 * @param {int} lvl
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export function loglvl(ns, lvl, tmpl, ...args) {
    if (lvl > 1) {
        return;
    }
    var now = new Date();
    tmpl = ns.sprintf("%s [%d] - %s", timestamp(), lvl, tmpl);
    ns.print(ns.sprintf(tmpl, ...args));
}