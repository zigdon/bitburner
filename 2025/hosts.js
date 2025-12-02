import { colors } from "./colors.js"
/** @param {NS} ns */
export async function main(ns) {
  var _hosts = dns(ns)
  var dest = ns.args[0]
  var path = []
  var hacking = ns.getPlayer().skills.hacking
  do {
    var color = ""
    if (_hosts.get(dest).hack > hacking) {
      color = "red"
    } else if (!_hosts.get(dest).backdoor) {
      color = "yellow"
    }
    if (color) {
      path.unshift(colors[color] + dest + colors["reset"])
    } else {
      path.unshift(dest)
    }
    dest = _hosts.get(dest).from
  } while (dest != "home")
  path.unshift(dest)
  ns.tprint(path.join(" -> "))
}

/** 
 * { name, root, ram, used, cur, max, hack, ports, from }
 * @param {NS} ns
 * @returns Map
 * */
export function dns(ns) {
  var _hosts = new Map()
  var data = Array.from(JSON.parse(ns.read("hosts.json")))
  for (var k of data) {
    _hosts.set(k.name, k)
  }

  return _hosts
}

export function autocomplete(data, args) {
  return [...data.servers];
}
