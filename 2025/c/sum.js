/*
 * Total Ways to Sum
    It is possible write four as a sum in exactly four different ways:

        3 + 1
        2 + 2
        2 + 1 + 1
        1 + 1 + 1 + 1

    How many different distinct ways can the number 80 be written as a sum of
    at least two positive integers?
*/
import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  return

  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Total Ways to Sum" || err(ns, "Wrong contract type: %s", c.type)
  var data = c.data
  var res = await solve(ns, data, {1:data})
  var msg = 0 // c.submit(res)
  if (f["toast"]) {
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprint(res)
    ns.tprint(msg)
  }
}

var seen = new Map()
async function solve(ns, data, path) {
  path.sort()
  if (seen.has(data+"+"+path.join("+"))) {
    return []
  }
  seen.set(data+"+"+path.join("+"), true)
  
  var res = []
  ns.tprintf("%s %j", data, path)
  await ns.asleep(10)
  if (data < 2) { return [] }
  for (var a=1; a<= data/2; a++) {
    if (a < data) {
      var sol = await solve(ns, data-a, [...path, a])
      ns.tprint(sol)
      res.push(...join(ns, a, sol))
    }
  }

  return res
}

function join(ns, a, b) {
  return b.map((i) => [a, ...i])
}
