import { dns } from "@/hosts.js"

/** @param {NS} ns */
export async function main(ns) {
  var flags = ns.flags([
    ["ls", false],
  ])
  var hosts = dns(ns)
  var n = flags._[0]
  if (!hosts.has(n)) {
    ns.tprint("Unknown host %s")
    return
  }
  if (flags["ls"]) {
    var scripts = []
    for (var f of ns.ls(n)) {
      if (f.endsWith(".cct")) {
        ns.tprintf("%s (%s)", f, ns.codingcontract.getContractType(f, n))
      } else {
        scripts.push(f)
      }
    }
    ns.tprintf("Scripts: %s", scripts.toSorted().join(", "))
    return
  }
  var host = hosts.get(n)
  if (host.backdoor) {
    ns.singularity.connect(n)
  } else {
    ssh(ns, hosts, n)
  }

}

export function autocomplete(data, args) {
  return [...data.servers];
}

/** @param {NS} ns
 * @param {Map} hosts
 * @param {String} target
 */
export function ssh(ns, hosts, target) {
  var src = ns.getHostname()
  var host = hosts.get(target)
  var path = [target]
  while (host.from != src) {
    path.unshift(host.from)
    host = hosts.get(host.from)
    if (host == undefined) {
      ns.tprint("Got lost: %j", path)
      return
    }
  }
  ns.print(path)
  while (path.length > 0) {
    if (!ns.singularity.connect(path[0])) {
      ns.tprintf("Failed to connect to %s", path[0])
      return false
    }
    path.shift()
  }

  return true
}
