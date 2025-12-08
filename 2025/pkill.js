import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var flags = ns.flags([
    ["kill", false]
  ])

  var ps = ns.ps().filter(
    (p) => p.filename != "pkill.js" &&
           [p.filename, ...p.args].join(" ").includes(flags._.join(" ")))
  ns.tprint(table(ns, ["PID", "Filename", "Args"], ps.map((p) => [p.pid, p.filename, p.args.join(" ")])))
  if (flags["kill"]) {
    var killed = 0
    var failed = 0
    ps.forEach((p) => ns.kill(p.pid) ? killed++ : failed++)
    ns.tprintf("%d killed, %d failed", killed, failed)
    return
  } 
  ns.tprint("pass -kill to terminate")
}
