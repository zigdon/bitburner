import {err} from "/contracts.js"
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

  var host = ns.args[0]
  var file = ns.args[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Find All Valid Math Expressions" || err(ns, "Wrong contract type: %s", c.type)
  // ns.tprint(c.description)
  var data = c.data
  // ns.tprint(data)
  var res = solve(ns, data, 4).map((r) => r.join(""))
  // ns.tprint(res)
  ns.tprint(c.submit(res))
}

/**
 * @param {NS} ns
 * @param {[String, Number]} data
 */
function solve(ns, data) {
  var res = []
  var nums = getNumbers(ns, data[0])

  for (var num of nums) {
    res.push(...combine(ns, num))
  }

  return res.filter((r) => eval(r.join("")) == data[1])
}

var ccache = new Map()

/**
 * @param {NS} ns
 * @param {Number[]} nums
 * @return String[]
 */
function combine(ns, nums) {
  var res = []
  if (nums.length == 1) {
    return [nums]
  }
  if (ccache.has(nums)) {
    return ccache.get(nums)
  }
  var sub = combine(ns, nums.slice(1))
  res.push(sub.map((s) => [nums[0], "+", ...s].flat()))
  res.push(sub.map((s) => [nums[0], "-", ...s].flat()))
  res.push(sub.map((s) => [nums[0], "*", ...s].flat()))
  ccache.set(nums, res.flat())
  return res.flat()
}

var cache = new Map()

/**
 * @param {NS} ns
 * @param {String} data
 * @return Number[][]
 */
function getNumbers(ns, data) {
  if (data.length == 1) {
    return [[data]]
  }
  if (cache.has(data)) {
    return cache.get(data)
  }

  var res = [[data]]

  for (var i=1; i<data.length; i++) {
    var num = data.substring(0,i)
    var others = getNumbers(ns, data.substring(i))
    for (var o of others) {
      res.push([num, ...o])
    }
  }

  // drop any sets that have leading 0s
  res = res.filter((s) => s.every((d) => d == "0" || d[0] != "0"))

  cache.set(data, res)

  return res
}
