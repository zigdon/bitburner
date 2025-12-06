/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var delay_ms = ns.args[1]
  await ns.sleep(delay_ms)
  ns.writePort(11, [
    "hack.js",
    3, // DEBUG
    ns.sprintf("[%s] Grew for %s", target, await ns.grow(target))
  ])
}
