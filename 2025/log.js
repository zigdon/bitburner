/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export function log(ns, tmpl, ...args) {
  ns.writePort(10, ns.sprintf(tmpl, ...args) + "\n")
  ns.printf(tmpl, ...args)
}

var loglevels = [ "CRITICAL", "WARNING", "INFO", "DEBUG" ]

/**
 * @param {NS} ns
 * @param {Number} level
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function logn(ns, level, tmpl, ...args) {
  while (ns.getPortHandle(11).full()) {
    ns.tprintf("Waiting for port from %s: %j", ns.getScriptName(), ns.getPortHandle(11).peek())
    await ns.asleep(1)
  }
  ns.writePort(11, [
    ns.getScriptName(),
    loglevels.indexOf(level.toUpperCase()),
    ns.sprintf(tmpl, ...args)])
  ns.printf(tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function toast(ns, tmpl, ...args) {
  ns.toast(ns.sprintf(tmpl, ...args), "info")
  await info(ns, tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function debug(ns, tmpl, ...args) {
  await logn(ns, "DEBUG", tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function info(ns, tmpl, ...args) {
  await logn(ns, "INFO", tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function warning(ns, tmpl, ...args) {
  await logn(ns, "WARNING", tmpl, ...args)
  ns.toast(ns.sprintf(tmpl, ...args), "warning")
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export async function critical(ns, tmpl, ...args) {
  await logn(ns, "CRITICAL", tmpl, ...args)
  ns.toast(ns.sprintf(tmpl, ...args), "error")
}
