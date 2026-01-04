/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var delay_ms = ns.args[1]
  ns.printf("%s: Starting sleep", new Date().toLocaleTimeString())
  await ns.sleep(delay_ms)
  ns.printf("%s: Starting hack", new Date().toLocaleTimeString())
  ns.writePort(11, [
    "hack.js",
    3, // DEBUG
    ns.sprintf(
      "[%s] Hacked for %s",
      target, await ns.hack(target)
    ),
  ])
  ns.printf("%s: Done", new Date().toLocaleTimeString())
}
