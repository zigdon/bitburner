/*
 * Subarray with Maximum Sum
   Given the following integer array, find the contiguous subarray (containing
   at least one number) which has the largest sum and return that sum. 'Sum'
   refers to the sum of all the numbers in the subarray.
    7,9,-10,-8,-6,8,8,7,-4,-5,-6,-1,-9,3,10,0,5,-2,-9,-4,-9,-5,-2,2,8,0,2,-4,0,7,1,-2,-7,3,-8,-10,-5,-9,9
*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Subarray with Maximum Sum", solve], 
  ])
  return init(ns, types, undefined, false)
}

function solve(ns, data) {
  var total = 0
  var max = 0
  for (var n of data) {
    total += n
    if (total > max) {
      max = total
    }
    if (total < 0) {
      total = 0
    }
  }

  return max
}

/*
function solve(ns, data) {
  var max = 0
  for (var s=0; s<data.length; s++) {
    for (var l=s+1; l<data.length; l++) {
      var m = data.slice(s, l).reduce((acc, cur) => acc + cur, 0)
      if (m > max) {
        ns.printf("%s <== (%s,%s) %j", m, s, l, data.slice(s, l))
      }
      max = Math.max(max, m)
    }
  }

  return max
}
*/
