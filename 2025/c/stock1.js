/*
  Algorithmic Stock Trader I
  You are given the following array of stock prices (which are numbers) where
  the i-th element represents the stock price on day i:

  11,163,173,25,98,117,25,82,114,176,23,104,18,4,27,151,129,124,111,120,112

  Determine the maximum possible profit you can earn using at most one transaction
  (i.e. you can only buy and sell the stock once). If no profit can be made then
  the answer should be 0. Note that you have to buy the stock before you can sell it.

  Algorithmic Stock Trader III
  
  Determine the maximum possible profit you can earn using at most two transactions.
  A transaction is defined as buying and then selling one share of the stock.
  Note that you cannot engage in multiple transactions at once. In other words,
  you must sell the stock before you buy it again.
  
  If no profit can be made, then the answer should be 0.

  Algorithmic Stock Trader IV
  You are given the following array with two elements:

  [7, [63,95,185,82,92,52,195,2,163,99,168,8,103,100,78,9,88,33]]

  The first element is an integer k. The second element is an array of stock
  prices (which are numbers) where the i-th element represents the stock price
  on day i.

  Determine the maximum possible profit you can earn using at most k transactions.
  A transaction is defined as buying and then selling one share of the stock. Note
  that you cannot engage in multiple transactions at once. In other words, you
  must sell the stock before you can buy it again.
*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Algorithmic Stock Trader I",   s1],
    ["Algorithmic Stock Trader II",  s2],
    ["Algorithmic Stock Trader III", s3],
    ["Algorithmic Stock Trader IV",  s4],
  ])
  return init(ns, types, undefined, false)
}

async function s1(ns, d) {
  return await solve2(ns, d, 1)
}
async function s2(ns, d) {
  return await solve2(ns, d, d.length)
}
async function s3(ns, d) {
  return await solve2(ns, d, 2)
}
async function s4(ns, d) {
  return await solve2(ns, d[1], d[0])
}

/**
 * @param {NS} ns
 * @param {Number[]} data
 * @param Number trades
 * @return Number
 */
async function solve(ns, data, trades) {
  await ns.asleep(10)
  if (data.length < 2) {
    return 0
  }

  if (trades == 1) {
    return Math.max(...data.map(
      (p, i) => i == data.length ? 0 : Math.max(...data.slice(i+1)) -p
    ))
  }

  // ns.tprintf("%s x %j", trades, data)

  var res = 0
  for (var i=0; i<data.length; i++) {
    var it = await solve(ns, data.slice(0, i), 1) + await solve(ns, data.slice(i), trades-1)
    if (it > res) {
      res = it
    }
  }

  return res

  /*
   return Math.max(
    ...data.map(async (_,i) => await solve(ns, data.slice(0, i), 1) + await solve(ns, data.slice(i), trades-1))
   )
  */
}

var ex = []
/**
 * @param {NS} ns
 * @param {Number[]} data
 * @param Number trades
 * @return Number
 */
async function solve2(ns, data, trades) {
  ns.printf("data=%j, trades=%j", data, trades)
  if (data.length < 2) {
    return 0
  }

  // Identify all the local minimum, potential buy points
  // Identify all the local max, potential sell points
  // Pick the best deltas
  var min = []
  var max = []
  var dir = data[1]-data[0]
  if (dir > 0) {
    min.push(data[0])
  }
  for (var i=1; i<data.length; i++) {
    var change = data[i]-data[i-1]
    if ((change<=0) == (dir<=0)) {
      // Continuing trend
      continue
    }
    dir = change
    if (change > 0) {
      // Local min
      min.push(data[i-1])
    } else {
      // Local max
      max.push(data[i-1])
    }
  }

  // Last dataset - if we were trending up, it's a new max
  if (dir > 0) {
    ns.printf("Final max: %d", data[data.length-1])
    max.push(data[data.length-1])
  }

  return await selectTrades(ns, min, max, trades)
}

var stCache = new Map()
async function selectTrades(ns, min, max, trades) {
  if (trades == 0 || min.length == 0 || max.length == 0) {
    return 0
  }
  var key = ns.sprintf("%j %j %j", min, max, trades)
  if (stCache.has(key)) {
    return stCache.get(key)
  }
  ns.printf("min = %j", min)
  ns.printf("max = %j", max)
  var res = 0
  var buy, sell
  for (var i=0; i<min.length; i++) {
    for (var j=i; j<max.length; j++) {
      var consider = max[j]-min[i]
      var following = await selectTrades(ns, min.slice(j+1), max.slice(j+1), trades-1)
      if (consider + following > res) {
        buy = min[i]
        sell = max[j]
        res = consider + following
        ex[trades-1] = ns.sprintf("%s->%s", buy, sell)
      }
    }
  }

  ns.print(ex)
  await ns.asleep(10)

  stCache.set(key, res)
  return res
}
