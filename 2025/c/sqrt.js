import {err, flags} from "@/contracts.js"
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

  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Square Root" || err(ns, "Wrong contract type: %s", c.type)
  // ns.tprint(c.description)
  var data = c.data
  var res = solve(ns, data)
  if (!res) {
    ns.tprintf("Failed to solve %s@%s", file, host)
    return
  }
  if (f["toast"]) {
    ns.toast(c.submit(res[0]))
    ns.toast(c.submit(res[1]))
  } else {
    ns.tprint(data)
    ns.tprint(c.submit(res[0]))
    ns.tprint(c.submit(res[1]))
  }
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
    // ns.print("wnt: ", data)
    ns.print("min: ", min)
    ns.print("max: ", max)
    ns.print("range: ", range)
    if (sq < data) {
      ns.print("too low: ", sqrt)
      // ns.print("delta = ", data-sq)
      min = sqrt
      sqrt = sqrt + (range/2n || 1n)
    } else {
      ns.print("too high: ", sqrt)
      // ns.print("delta = ", sq-data)
      max = sqrt
      sqrt = sqrt - (range/2n || 1n)
    }
    sq = sqrt ** 2n
  }

  return [min, max]

  /*
  for (var n=min; n<=max; n+=1n) {
    var delta = n ** 2n - data
    var eq = n ** 2n == data
    ns.printf("===\n%s ** 2 =\n%s\n", n, n**2n, data)
    ns.print(delta)
    ns.print(eq)
    if (delta == 0) {
      return n
    }
  }
  */
  return 0
}
