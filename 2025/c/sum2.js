/*
 * Total Ways to Sum II
 *  How many different distinct ways can the number 43 be written as a sum of
 *  integers contained in the set:
 *
 *  [1,2,4,7,8,9,10,11]?
 *
 *  You may use each integer in the set zero or more times.
 */

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]

  ns.tprintf("NOT IMPLEMENTED")
  return

  ns.disableLog("asleep")
  ns.clearLog()

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
    "Total Ways to Sum II",
  ].indexOf(c.type)
  if (type == -1) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  // ns.tprint(c.description)
  var data = c.data
  ns.print(data)
  var res = await solve(ns, data)
  ns.print(res)
  return
  var msg = c.submit(res)
  if (fs["toast"]) {
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprint(data)
    ns.tprint(res)
    ns.tprint(msg)
  }
}

var c = new Map()

/**
 * @param {NS} ns
 * @param {Number[]} data
 */
async function solve(ns, data) {
  await ns.asleep(100)
  var target = data[0]
  if (c.has(target)) {
    // ns.printf("ret(cached): %j", c.get(target))
    return c.get(target)
  }
  if (data[0] == 0 || data[1] == undefined) {
    ns.print("ret(empty)=[]")
    return []
  }
  var ints = data[1].sort((a,b) => b-a)
  ints = ints.filter((n,i) => i == 0 || n != ints[i-1])
  ints = ints.filter((n) => n<=target)
  ns.printf("ints=%j", ints)
  var res = []
  for (var i of ints) {
    ns.printf("%d - %d...", target, i)
    if (target - i > 0) {
      ns.printf("solve(%d, %j)", target-i, ints)
      for (var r of await solve(ns, [target-i, ints])) {
        // ns.printf("[%d]+%j", i, r)
        res.push([i,...r])
      }
    } else if (i == target) {
      // ns.printf("end: %j...", i)
      res.push([i])
    }
  }

  ns.printf("ret=%d", res.length)
  c.set(target, res.sort())
  return c.get(target)
}

export function autocomplete(data, args) {
  if (args[0] != undefined) {
    return [ ...data.servers.filter((h) => h.includes(args[0])) ]
  }
  return [...data.servers];
}
