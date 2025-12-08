/*
 * Total Ways to Sum
 *
 * It is possible write four as a sum in exactly four different ways:
 *
 *  3 + 1
 *  2 + 2
 *  2 + 1 + 1
 *  1 + 1 + 1 + 1
 *
 * How many different distinct ways can the number 11 be written as a sum of at least two positive integers?
 *
 * Euler's Pentagonal Number Theorem:
 * w(k) = (k*(3*k[+-]1))/2
 * p(n) = sum(k=1..p-1):(-1)**(k-1)*p(n-w(k))
 *      = p(n−1)+p(n−2)−p(n−5)−p(n−7)+p(n−12)+p(n−15)−…
 *
 * Total Ways to Sum II
 *  How many different distinct ways can the number 43 be written as a sum of
 *  integers contained in the set:
 *
 *  [1,2,4,7,8,9,10,11]?
 *
 *  You may use each integer in the set zero or more times.
 */

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = [
    "Total Ways to Sum I",
  ]
  return init(ns, types, test, false)
}

/**
 * @param {NS} ns
 * @param {Number[]} data
 */
async function euler(ns, data) {
  await ns.asleep(10)
  if (data == 0) {
    return 1
  } else if (data < 0) {
    return 0
  }
  var gpn = w(ns, data)
  var res = 0
  // ++--++--
  // 01234567
  for (var n=0; n<gpn.length; n++) {
    if (gpn[n] > data) {
      break
    }
    if (n%4 < 2) {
      ns.printf("+p(%d-%d) => +p(%d)", data, gpn[n], data-gpn[n])
      res += await euler(ns, data-gpn[n])
      ns.printf(" => %d", res)
    } else {
      ns.printf("-p(%d-%d) => +p(%d)", data, gpn[n], data-gpn[n])
      res -= await euler(ns, data-gpn[n])
      ns.printf(" => %d", res)
    }
  }

  ns.printf("=== euler(%d) = %d", data, res)

  return res
}

var pent = new Map()
// generalized pentagonal numbers up to n
function w(ns, n) {
  if (pent.has(n)) {
    return pent.get(n)
  }
  var res = []
  var k = 1
  while (res.length == 0 || res[res.length-1] < n) {
    res.push((k*(3*k-1))/2)
    if (res[res.length-1] >= n) { break }
    res.push((k*(3*k+1))/2)
    k++
  }

  pent.set(n, res)
  ns.printf("w(%d) = %j", n, res)
  return res
}

export function autocomplete(data, args) {
  if (args[0] != undefined) {
    return [ ...data.servers.filter((h) => h.includes(args[0])) ]
  }
  return [...data.servers];
}

async function test(ns, testdata) {
  var tests = [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 7],
    [6, 11],
    [7, 15],
  ]
  if (testdata.length > 0) {
    tests = [[testdata[0], testdata[1]]]
  }
  ns.tprintf("Running tests:")
  tests.forEach((t) => ns.tprintf("%j", t))
  for (var t of tests) {
    var passed = true
    ns.tprintf("=== Partitioning %s", t[0])
    var got = await euler(ns, t[0])
    if (got != t[1]) {
      ns.tprintf("======= FAILED: got %j want %j", got, t[1])
      passed = false
    }
    if (passed) {
      ns.tprintf("======= PASSED")
    } else {
      ns.tprintf("======= FAILED")
    }
  }

  return
}
