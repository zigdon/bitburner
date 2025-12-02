/*
 * Subarray with Maximum Sum
   Given the following integer array, find the contiguous subarray (containing
   at least one number) which has the largest sum and return that sum. 'Sum'
   refers to the sum of all the numbers in the subarray.
    7,9,-10,-8,-6,8,8,7,-4,-5,-6,-1,-9,3,10,0,5,-2,-9,-4,-9,-5,-2,2,8,0,2,-4,0,7,1,-2,-7,3,-8,-10,-5,-9,9
*/

import {err, flags} from "/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Subarray with Maximum Sum" || err(ns, "Wrong contract type: %s", c.type)
  var data = c.data
  var res = solve(ns, data)
  var msg = c.submit(res)
  if (f["toast"]) {
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprint(res)
    ns.tprint(msg)
  }
}

function solve(ns, data, path) {
  var max = 0
  for (var s=0; s<data.length; s++) {
    for (var l=s+1; l<data.length-s; l++) {
      var m = data.slice(s, l).reduce((acc, cur) => acc + cur, 0)
      // ns.tprintf("%s <== (%s,%s) %j", m, s, l, data.slice(s, l))
      max = Math.max(max, m)
    }
  }

  return max
}
