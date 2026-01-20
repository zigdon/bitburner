/*
 * Total Ways to Sum II
  How many different distinct ways can the number 15 be written as a sum of
  integers contained in the set:

  [1,3,6,7,8,9,10,11,12,13,14,15]?

  You may use each integer in the set zero or more times.
 */

import {err, init} from "@/contracts.js"
import {table} from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  var types = new Map([
    ["Total Ways to Sum II", solve],
  ])
  return init(ns, types, undefined, false)
}

// I admit, i asked gemini for help. Not sure i even understand why this works.
function solve(ns, data) {
  var target = data[0]
  var numbers = data[1]

  var dp = Array(target+1).fill(0)
  dp[0] = 1
  for (var num of numbers) {
    for (var i=num; i<= target; i++) {
      dp[i] += dp[i-num]
    }
  }

  return dp[target]
}
