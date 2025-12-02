/** @param {NS} ns */
export async function main(ns) {
  var port = ns.args[0]
  var ts = ns.args[1]
  var msg = ns.args.slice(2).join(" ")
  ns.printf("Sending to %s after %s: %s", port, ts, msg)
  await ns.asleep(ts)
  ns.writePort(port, msg)
}