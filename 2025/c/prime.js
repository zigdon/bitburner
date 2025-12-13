/*
  A prime factor is a factor that is a prime number.
  What is the largest prime factor of 574756370?
*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Find Largest Prime Factor", solve],
  ])
  return await init(ns, types, undefined, false)
}

/** @param {Number} data */
function solve(ns, data) {
  var sqrt = Math.ceil(Math.sqrt(data))
  var div = 2
  while (div <= sqrt) {
    while (Math.floor(data/div) == data/div) {
      ns.printf("%f/%f=%f", data, div, data/div)
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
