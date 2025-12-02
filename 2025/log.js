/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 * */
export function log(ns, tmpl, ...args) {
  ns.writePort(10, ns.sprintf(tmpl, ...args) + "\n")
  ns.printf(tmpl, ...args)
}