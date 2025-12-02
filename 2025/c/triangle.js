import {err, flags} from "/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
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
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Minimum Path Sum in a Triangle" || err(ns, "Wrong contract type: %s", c.type)
  var data = c.data
  var res = solve(data, 0)
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
