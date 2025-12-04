/*
  Array Jumping Game
  You are given the following array of integers:

  7,10,10,0

  Each element in the array represents your MAXIMUM jump length at that position.
  This means that if you are at position i and your maximum jump length is n, you
  can jump to any position from i to i+n. 

  Assuming you are initially positioned at the start of the array, determine
  whether you are able to reach the last index.

  Your answer should be submitted as 1 or 0, representing true and false
  respectively.

  Array Jumping Game II
  You are given the following array of integers:

  2,3,4,4,0,4,3,3,3,6,1,3,5,5,1

  Assuming you are initially positioned at the start of the array, determine
  the minimum number of jumps to reach the end of the array.

  If it's impossible to reach the end, then the answer should be 0.

*/

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
    "Array Jumping Game",
    "Array Jumping Game II",
  ].indexOf(c.type)
  if (type == -1) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  // ns.tprint(c.description)
  var data = c.data
  ns.print(data)
  var res = solve(ns, data, 0)
  ns.print(res)
  if (type == 0) {
    res = res > -1 ? 1 : 0
  } else {
    res = res > -1 ? res : 0
  }
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

/**
 * @param {NS} ns
 * @param {Number[]} data
 * @param {Number} acc
 */
function solve(ns, data, acc) {
  // Reached the end
  if (data.length == 1) {
    return acc
  }
  // Couldn't reach the end
  if (data[0] == 0) { 
    return -1
  }
  var best = -1
  for (var i=Math.min(data[0], data.length); i>0; i--) {
    var s = solve(ns, data.slice(i), acc+1)
    if (s == -1) {
      continue
    }
    best = best == -1 ? s : Math.min(best, s)
  }

  return best
}
