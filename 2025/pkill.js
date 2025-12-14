import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var flags = ns.flags([
    ["kill", false],
    ["keep", 0],
  ])

  var ps = ns.ps().filter(
    (p) => p.filename != "pkill.js" &&
           [p.filename, ...p.args].join(" ").includes(flags._.join(" ")))
  ns.tprint(table(ns, ["PID", "Filename", "Args", "Skip"], ps.map((p, n) => [p.pid, p.filename, p.args.join(" "), flags["keep"] > n ? "skip" : ""])))
  if (flags["kill"]) {
    var killed = 0
    var failed = 0
    var skipped = 0
    ps.forEach((p, n) => flags["keep"] > n ? skipped ++ : ns.kill(p.pid) ? killed++ : failed++)
    ns.tprintf("%d skipped, %d killed, %d failed", skipped, killed, failed)
    return
  } 
  ns.tprint("pass -kill to terminate")
}
