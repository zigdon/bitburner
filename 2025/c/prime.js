import {err} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  /*
    A prime factor is a factor that is a prime number.
    What is the largest prime factor of 574756370?
  */
  var host = ns.args[0]
  var file = ns.args[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Find Largest Prime Factor" || err(ns, "Wrong contract type: %s", c.type)
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

/** @param {Number} data */
function solve(ns, data) {
  var sqrt = Math.ceil(Math.sqrt(data))
  var div = 2
  while (div <= sqrt) {
    while (Math.floor(data/div) == data/div) {
      ns.tprintf("%f/%f=%f", data, div, data/div)
      data /= div
      if (data == 1) {
        return div
      }
    }
    if (div == 2) {
      div = 3
    } else {
      div += 2
    }
  }

  return data
}
