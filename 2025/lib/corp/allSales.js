import {info} from "@/log.js"

let cmds = new Map([
  ["stop",  (ns, div, city, mat) => ns.corportation.sellMaterial(div, city, mat, 0, "MP")],
])

/** @param {NS} ns */
export async function main(ns) {
  const c = ns.corporation
  const apply = (f) => {
    for (let div of c.getCorporation().divisions) {
      for (let city of c.getDivision(div).cities) {
        if (!c.hasWarehouse(div, city)) {
          continue
        }
        for (let mat of c.getConstants().materialNames) {
          c.sellMaterial(div, city, mat, 0, "MP")
        }
      }
    }
  }
  let cmd = ns.args[0]
  if (cmds.has(cmd)) {
    await apply(cmds.get(cmd))
    return
  } else if (cmd == "reset") {
    ns.run("lib/corp/smartSupply.js")
    return
  }

  let keys = Array.from(cmds.keys())
  keys.push("reset")
  ns.tprintf("Available commands: %s", keys.join(", "))
}
