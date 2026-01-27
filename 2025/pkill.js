import { table } from "@/table.js"
import { dns } from "@/hosts.js"

/** @param {NS} ns */
export async function main(ns) {
  var flags = ns.flags([
    ["kill", false],
    ["k", false],
    ["all", false],
    ["a", false],
    ["keep", 0],
  ])

  var ps = runPs(ns, flags)
  ns.tprint(table(ns,
    ["Host", "PID", "Threads", "Memory", "Filename", "Args", "Skip"],
    ps.map(
      (p, n) => [
        p[0], p[1].pid, p[1].threads, ns.formatRam(p[2]), p[1].filename, p[1].args.join(" "),
        flags["keep"] > n ? "skip" : ""]
    )))
  if (flags["kill"] || flags["k"]) {
    var killed = 0
    var failed = 0
    var skipped = 0
    ps.forEach((p, n) => flags["keep"] > n ? skipped ++ : ns.kill(p[1].pid) ? killed++ : failed++)
    ns.tprintf("%d skipped, %d killed, %d failed", skipped, killed, failed)
    return
  } 
  ns.tprint("pass --kill to terminate")
}

export function autocomplete(data, args) {
  return [...data.scripts]
}

/**
 * @param {NS} ns
 * @param {[string, any]} flags
 **/
function runPs(ns, flags) {
  let all = flags["all"] || flags["a"]
  let hosts = Array.from(dns(ns).keys())
  let ps = []
  for (let h of hosts) {
    if (!all && h != "home") continue
    ps.push(...ns.ps(h).filter(
      (p) => p.filename != "pkill.js" &&
             [p.filename, ...p.args].join(" ").includes(flags._.join(" "))
    ).map((p) => [h, p, ns.getScriptRam(p.filename, h) * p.threads]))
  }

  return ps
}
