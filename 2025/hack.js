/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var delay_ms = ns.args[1]
  await ns.sleep(delay_ms)
  ns.writePort(10,
    ns.sprintf(
      "[%s] Hacked for %s",
      target, await ns.hack(target)
    ))
}