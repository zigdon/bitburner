import {dns} from "./hosts.js"
import {ssh} from "./ssh.js"
/** @param {NS} ns */
export async function main(ns) {
  var target = ns.args[0]
  var hosts = dns(ns)
  var host = hosts.get(target)
  if (host.backdoor) {
    ns.printf("%s already backdoored", target)
    return
  }

  ns.singularity.connect("home")
  if (ssh(ns, hosts, target)) {
    await ns.singularity.installBackdoor()
  } else {
    ns.printf("Failed to ssh to %s", target)
  }
}

export function autocomplete(data, args) {
  return [...data.servers];
}
