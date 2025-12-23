/*
  Merge Overlapping Intervals
  Given the following array of arrays of numbers representing a list of intervals,
  merge all overlapping intervals.

  [[5,11],[15,21],[14,15],[9,14],[4,8],[18,21],[14,20],[5,9],[3,12],[17,20],[19,25],
    [19,20],[14,20],[2,8]]

  Example:

  [[1, 3], [8, 10], [2, 6], [10, 16]]

  would merge into [[1, 6], [8, 16]].

  The intervals must be returned in ASCENDING order. You can assume that in an
  interval, the first number will always be smaller than the second.
*/

import {init} from "@/contracts.js"

/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Merge Overlapping Intervals", solve],
  ])
  return await init(ns, types, undefined, false)
}

/**
 * @param {NS} ns
 * @param {Number[][]} data
 * @return Number[][]
 * 1-5 7-10
 *  4---8
 */
function solve(ns, data) {
  data.sort((a,b) => a[0] - b[0])
  var res = [data[0]]
  for (var i=1; i<data.length; i++) {
    var found = false
    var d = data[i]
    // ns.tprintf("%j: %s", res, d)
    for (var j=0; j<res.length; j++) {
      if ((res[j][0] <= d[0] && d[0] <= res[j][1]) || (res[j][0] <= d[1] && d[1] <= res[j][1])) {
        // ns.tprintf("merged with %s", res[j])
        res[j][0] = Math.min(res[j][0], d[0])
        res[j][1] = Math.max(res[j][1], d[1])
        found = true
        break
      }
    }
    if (!found) {
      // ns.tprintf("Adding %s", d)
      res.push(d)
    }
  }
  return res
}
