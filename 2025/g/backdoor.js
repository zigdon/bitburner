import {dns} from "@/hosts.js"
import {ssh} from "@/ssh.js"

let hosts;

/** @param {NS} ons */
export async function main(ns) {
  hosts = dns(ns)
  let targets = ns.args
  if (targets.length == 0) {
    let ph = ns.getPlayer().skills.hacking
    targets = Array.from(hosts.values()).filter(
      (h) => !h.purchased && !h.backdoor && h.root && h.hack <= ph
    ).sort(
      (a,b) => b.hack - a.hack
    ).filter(
      (h) => h.name != "w0r1d_d43m0n"
    )
  }
  while (targets.length > 0) {
    let target = targets.shift()

    await backdoor(ns, target)
  }
  await ssh(ns, hosts, "home")
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

  if (await ssh(ns, hosts, host.name)) {
    ns.printf("Starting backdoor on %s", host.name)
    return ns.singularity.installBackdoor()
  } else {
    ns.printf("Failed to ssh to %s", host.name)
  }
}
