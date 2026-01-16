import {init} from "@/contracts.js"
import {diff} from "@/lib/util.js"

/** @param {NS} ns */
export async function main(ns) {
  /*
  Find All Valid Math Expressions
  You are given the following string which contains only digits between 0 and 9:

  884889

  You are also given a target number of -70. Return all possible ways you can add
  the +(add), -(subtract), and *(multiply) operators to the string such that it
  evaluates to the target number. (Normal order of operations applies.)

  The provided answer should be an array of strings containing the valid
  expressions. The data provided by this problem is an array with two elements.
  The first element is the string of digits, while the second element is the
  target number:

  ["884889", -70]

  NOTE: The order of evaluation expects script operator precedence.
  NOTE: Numbers in the expression cannot have leading 0's. In other words,
  "1+01" is not a valid expression.

  Examples:

  Input: digits = "123", target = 6
  Output: ["1+2+3", "1*2*3"]

  Input: digits = "105", target = 5
  Output: ["1*0+5", "10-5"]
  */

  let types = new Map([
    ["Find All Valid Math Expressions", solve],
  ])
  await init(ns, types, test, false, false)
}

let cache = new Map()
let ncache = new Map()
let queue = []
const key = (l) => l?.join("/")
/**
 * @param {NS} ns
 * @param {[String, Number]} data
 */
async function solve(ns, data) {
  cache.clear()
  let res = []
  let nums = getNumbers(ns, String(data[0]))
  queue = [...nums]

  while (queue.length > 0) {
    await ns.asleep(1)
    // queue.forEach((v) => ns.print(v))
    let next = queue.shift()
    // ns.printf("next = %j", next)
    if (next == undefined) continue
    combine2(ns, next)
    if (next?.join("") == data[0])
      for (let r of cache.get(key(next)) ?? []) {
        if (eval(ns.sprintf("%s==%d", r, data[1]))) {
          if (!res.includes(r)) res.push(r)
        }
      }
    ns.printf("=== %d -> %d", queue.length, res.length)
  }

  ns.printf("totalling %d:", data[1])
  res.forEach((r) => ns.printf("%j", r))
  return res
}

/**
 * @param {NS} ns
 * @param {Number[]} nums
 * @return String[]
 */
function combine2(ns, nums) {
  // if a single number, just return it.
  // if it's cached, return the cache
  // if two numbers, return them with +-*
  // if more, split into two:
  //   if they're already in the cache, use that with +-*
  //   if not, add to the queue, and return the original to the queue

  const pair = (a,b) => {
    let r = []
    // ns.printf("pairing %j and %j", a, b)
    for (let i of a) {
      for (let j of b) {
        r.push(i+"+"+j)
        r.push(i+"-"+j)
        r.push(i+"*"+j)
      }
    }
    return r
  }
  const ret = (a) => {
    // ns.printf("setting cache: %j -> %j", nums, a)
    cache.set(key(nums), a)
  }
  if (cache.has(key(nums))) {
    // ns.printf("cache hit for %j", nums)
    return
  }

  if (nums.length == 1) {
    ns.printf("1 value: %j", nums)
    return ret(nums)
  }
  if (nums.length == 2) {
    ns.printf("2 value: %j", nums)
    return ret(pair([nums[0]], [nums[1]]))
  }

  let mid = Math.floor(nums.length/2)
  let a = nums.slice(0, mid)
  let b = nums.slice(mid)
  let wait = false
  if (!cache.has(key(a))) {
    ns.printf("Queue a: %j", a)
    wait = true
    queue.push(a)
  }
  if (!cache.has(key(b))) {
    ns.printf("Queue b: %j", b)
    wait = true
    queue.push(b)
  }
  if (wait) {
    ns.printf("Requeue %j", nums)
    queue.push(nums)
    return
  }
  return ret(pair(cache.get(key(a)), cache.get(key(b))))
}

/**
 * @param {NS} ns
 * @param {Number[]} nums
 * @return String[]
 */
async function combine(ns, nums, depth) {
  await ns.asleep(10)
  let res = []
  if (nums.length == 1) {
    return [String(nums[0])]
  }
  if (cache.has(nums)) {
    return cache.get(nums)
  }
  let h = Math.floor(nums.length/2)
  let a = nums.slice(0, h)
  let b = nums.slice(h)
  ns.printf("%d: combine(%j) -> %j | %j", depth, nums, a, b)
  let suba, subb
  if (cache.has(a)) {
    suba = cache.get(a)
  } else {
    suba = await combine(ns, a, depth+1)
  }
  // ns.printf("A: %j -> %j", a, suba)
  if (cache.has(b)) {
    subb = cache.get(b)
  } else {
    subb = await combine(ns, b, depth+1)
  }
  // ns.printf("B: %j -> %j", b, subb)
  res.push(...suba.map((sa) => subb.map((sb) => sa + "+" + sb)).flat())
  res.push(...suba.map((sa) => subb.map((sb) => sa + "-" + sb)).flat())
  res.push(...suba.map((sa) => subb.map((sb) => sa + "*" + sb)).flat())
  cache.set(nums, res)
  ns.printf("combine(%j) -> %j", nums, res.length)
  return res
}

/**
 * @param {NS} ns
 * @param {String} data
 * @return Number[][]
 */
function getNumbers(ns, data) {
  if (data.length == 1) {
    // ns.printf("%j.length ==1", data)
    return [[data]]
  }
  if (ncache.has(data)) {
    // ns.printf("cache hit for %j", data)
    return ncache.get(data)
  }

  let res = [[data]]

  for (let i=1; i<data.length; i++) {
    let num = data.substring(0, i)
    // ns.printf("1: num=%j", num)
    // Don't allow octets
    // if (num.length > 1 && num[0] == "0") continue

    let others = getNumbers(ns, data.substring(i))
    // ns.printf("2: others=%j", others)

    // if (others.some((v) => v.length > 1 && v[0] == "0")) continue
    for (let o of others) {
      // ns.printf("3: o=%j", o)
      res.push([num, ...o])
    }
  }

  // drop any sets that have leading 0s
  // ns.printf("filtering results: %j", res)
  res = res.filter((s) => s.every((d) => d == "0" || d[0] != "0"))
  // ns.printf("filtered results: %j", res)

  ncache.set(data, res)
  // ns.printf("getnumbers(%j)=%j", data, res)

  return res
}

async function test(ns, testdata) {
  /*
    Input: digits = "123", target = 6
    Output: ["1+2+3", "1*2*3"]

    Input: digits = "105", target = 5
    Output: ["1*0+5", "10-5"]
  */
  let tests = [
    [123, 6, ["1+2+3", "1*2*3"]],
    [105, 5, ["1*0+5", "10-5"]],
  ]
  for (let t of tests) {
    ns.tprintf("=== Solving %s => %s", t[0], t[1])
    let got = await solve(ns, [t[0], t[1]])
    let d = diff(ns, t[2], got)
    if (d != "") {
      ns.tprintf("=== FAILED\n%s", d)
    } else {
      ns.tprintf("=== PASSED")
    }
  }
}
