import {err} from "../contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  /*
  Square Root
  You are given a ~200 digit BigInt. Find the square root of this number, to the
  nearest integer.

  The input is a BigInt value. The answer must be the string representing the
  solution's BigInt value. The trailing "n" is not part of the string.

  Hint: If you are having trouble, you might consult
  https://en.wikipedia.org/wiki/Methods_of_computing_square_roots

  Input number:
  212944707162126806509262934660767282548802561525114580961832928758519796585180714802067298159526596192030677964074770173480215855362026691922772166021685250577908498248495244867239132531893326579190931
  */

  var host = ns.args[0]
  var file = ns.args[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Square Root" || err(ns, "Wrong contract type: %s", c.type)
  // ns.tprint(c.description)
  var data = c.data
  ns.tprint(data)
  var res = solve(ns, data)
  if (!res) {
    ns.tprintf("Failed to solve %s@%s", file, host)
  }
  ns.tprint(res)
  ns.tprint(c.submit(res))
}

/**
 * @param {NS} ns
 * @param {BigInt} data
 * @return BigInt
 */
function solve(ns, data) {
  var sqrt = 1n
  var min = 1n
  var max = data
  var sq = sqrt
  while (max-min > 1n) {
    var range = max-min
    if (sq < data) {
      min = sqrt
      sqrt = sqrt + (range/2n || 1n)
    } else {
      max = sqrt
      sqrt = sqrt - (range/2n || 1n)
    }
    sq = sqrt ** 2n
  }

  if (min ** 2n - data > max ** 2n - data) {
    return max
  }
  return min
}
