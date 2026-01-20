import {init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  /*
    Given a triangle, find the minimum path sum from top to bottom.
    In each step of the path, you may only move to adjacent numbers
    in the row below. The triangle is represented as a 2D array of numbers:

    [
        [2],
       [3,4],
      [6,5,7],
     [4,1,8,3]
    ]

    The minimum path sum is 11 (2 -> 3 -> 5 -> 1).
  */
  await init(ns, new Map([
    ["Minimum Path Sum in a Triangle", (data) => solve(data, 0)]
  ]), undefined, false, false)
}

/**
 * @param {Number[][]} data
 * @param {Number} pos
 * @return Number
 */
function solve(data, pos) {
  if (data.length > 1) {
    return data[0][pos] + Math.min(
      solve(data.slice(1), pos),
      solve(data.slice(1), pos+1),
    )
  }
  return data[0][pos]
}
