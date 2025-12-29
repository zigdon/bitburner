import {dns} from "@/hosts.js"
import {ssh} from "@/ssh.js"
import {nsRPC} from "@/lib/nsRPC.js"

var hosts;

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(67.45)
  /** @type {NS} */
  let ns = new nsRPC(ons)
  while (ns.args.length > 1) {
    if (ns.run(ns.getScriptName(), 1, ns.args[0]) > 0) ns.args.unshift()
  }
  var target = ns.args[0]
  hosts = dns(ns)
  if (target == undefined) {
    var ph = ns.getPlayer().skills.hacking
    var targets = Array.from(hosts.values()).filter(
      (h) => !h.purchased && !h.backdoor && h.root && h.hack <= ph
    ).sort(
      (a,b) => b.hack - a.hack
    ).filter(
      (h) => h.name != "w0r1d_d43m0n"
    )
    for (var t of targets) {
      ns.run(ns.getScriptName(), 1, t.name) || await backdoor(ns, t)
    }
    return
  }

  await backdoor(ns, hosts.get(target))
  ssh(ns, hosts, "home")
}

export function autocomplete(data, args) {
  return [...data.servers];
}

async function backdoor(ns, host) {
  if (ns.ps("home").filter(
    (p) => p.pid != ns.pid &&
          p.filename == ns.getScriptName() &&
          p.args[0] == host.name).length > 0) {
    ns.printf("%s already being backdoored", host.name)
    return
  }
  if (host.backdoor) {
    ns.printf("%s already backdoored", host.name)
    return
  }

  if (ssh(ns, hosts, host.name)) {
    ns.printf("Starting backdoor on %s", host.name)
    return ns.singularity.installBackdoor()
  } else {
    ns.printf("Failed to ssh to %s", host.name)
  }
}
