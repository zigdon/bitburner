import {dns} from "@/hosts.js"
import {ssh} from "@/ssh.js"
/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var hosts = dns(ns)
  var host = hosts.get(target)
  if (ns.ps("home").filter(
    (p) => p.pid != ns.pid &&
           p.filename == ns.getScriptName() &&
           p.args[0] == target).length > 0) {
    ns.printf("%s already being backdoored", target)
    return
  }
  if (host.backdoor) {
    ns.printf("%s already backdoored", target)
    return
  }

  if (ssh(ns, hosts, target)) {
    await ns.singularity.installBackdoor()
    ns.singularity.connect("home")
  } else {
    ns.printf("Failed to ssh to %s", target)
  }
}

export function autocomplete(data, args) {
  return [...data.servers];
}
