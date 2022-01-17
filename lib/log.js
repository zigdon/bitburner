function timestamp() {
    var now = new Date();
    return now.toLocaleTimeString("en-US", { timeZone: "PST" }) + " - ";
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
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export function log(ns, tmpl, ...args) {
    tmpl = timestamp() + tmpl;
    ns.print(ns.sprintf(tmpl, ...args));
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function send(ns, tmpl, ...args) {
    tmpl = timestamp() + hostname(ns) + proc(ns) + tmpl;
    var msg = ns.sprintf(tmpl, ...args);
    await ns.tryWritePort(5, msg);
}

/**
 * @param {NS} ns
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export async function console(ns, tmpl, ...args) {
    ns.tprintf(tmpl, ...args);
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
 * @param {int} lvl
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export function loglvl(ns, lvl, tmpl, ...args) {
    if (lvl > 1) {
        return;
    }
    var now = new Date();
    tmpl = ns.sprintf("%s [%d] - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), lvl, tmpl);
    ns.print(ns.sprintf(tmpl, ...args));
}