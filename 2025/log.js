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
export function logn(ns, level, tmpl, ...args) {
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
export function debug(ns, tmpl, ...args) {
  logn(ns, "DEBUG", tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export function info(ns, tmpl, ...args) {
  logn(ns, "INFO", tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export function warning(ns, tmpl, ...args) {
  logn(ns, "WARNING", tmpl, ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export function critical(ns, tmpl, ...args) {
  logn(ns, "CRITICAL", tmpl, ...args)
}
