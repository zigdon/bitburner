/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var delay_ms = ns.args[1]
  await ns.sleep(delay_ms)
  await ns.weaken(target)
  ns.writePort(10,
    ns.sprintf(
      "[%s] Weakened for %s",
      target, await ns.weaken(target)
    ))
}