/*
 * Sanitize Parentheses in Expression
    Given the following string:

    (()()(

    remove the minimum number of invalid parentheses in order to validate the
    string. If there are multiple minimal ways to validate the string, provide
    all of the possible results. The answer should be provided as an array of
    strings. If it is impossible to validate the string the result should be an
    array with only an empty string.

    IMPORTANT: The string may contain letters, not just parentheses.

    Examples:

    "()())()" -> ["()()()", "(())()"]
    "(a)())()" -> ["(a)()()", "(a())()"]
    ")(" -> [""]
*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Sanitize Parentheses in Expression", solve],
  ])
  return init(ns, types, test, false)
}

/**
 * @param {NS} ns
 * @param {String} data
 */
async function solve(ns, data) {
  var res = []
  ns.print(data)
  // If we don't have both ( and ), remove all of them
  if (data.indexOf("(") == -1 || data.indexOf(")") == -1) {
    ns.printf("No parens in %s", data)
    return [data.replaceAll(/[()]/g, "")]
  }
  // Trim the ends that are always invalid
  while (data.includes(")") && data.indexOf(")") < data.indexOf("(")) {
    ns.printf("Trimming ')' from %j", data)
    await ns.asleep(10)
    data = data.replace(")", "")
  }
  while (data.includes("(") && data.lastIndexOf("(") > data.lastIndexOf(")")) {
    ns.printf("Trimming '(' from %j", data)
    await ns.asleep(10)
    data = data.substring(0, data.lastIndexOf("(")) + data.substring(1+data.lastIndexOf("("))
  }
  ns.printf("Dont trimming")

  // Check if we're good
  var valid = checkValid(ns, data)
  if (valid[1] == -1) {
    ns.printf("%s is good", data)
    return [data]
  }
  var fi = valid[1]
  var extra = valid[0]

  ns.printf("Removing %s from %s", extra, data)
  for (var m of data.matchAll(extra)) {
    await ns.asleep(10)
    var removed = data.substr(0, m.index) + data.substr(m.index+1)
    var valid = checkValid(ns, removed)
    // Are we good?
    if (valid[1] == -1) {
      res.push(removed)
      continue
    }
    // Make sure we didn't make it worse
    if (valid[1] < fi-1) {
      ns.printf("Worse: %s -> %s (%d<%d)", data, removed, valid[1], fi)
      continue
    }
    ns.printf("Removing %s from %s -> %s", extra, data, removed)
    res.push(...await solve(ns, removed))
  }

  // Only keep valid, longest ones
  // res = res.filter((r) => checkValid(ns, r) == -1)

  var max = Math.max(...res.map((r) => r.length))
  res = res.filter((r) => r.length == max).sort()
  // Remove any duplicates
  res = res.sort().filter((r, i) => i == 0 || r != res[i-1])

  return res
}

/** @param {NS} ns
 *  @param {String} data
 *  @return String, Number
 *
 *  If valid, return "", -1
 *  Otherwise, return '(' or ')', position of the error
 */
function checkValid(ns, data) {
  if (data.length == 0) {
    return ["", -1]
  }
  // ns.tprintf("Checking %s", data)
  var count = 0
  for (var i=0; i<data.length; i++) {
    count += data[i] == "(" ? 1 : data[i] == ")" ? -1 : 0
    // ns.tprintf("  %s -> %d", data[i], count)
    if (count < 0) {
      // ns.tprintf("  Invalid at %d", i)
      return ["\\)", i]
    }
  }

  if (count == 0) {
    return ["", -1]
  }

  return ["\\(", data.length]
}

async function test(ns, testdata) {
  var tests = [
    ["()())()", ["()()()", "(())()"]],
    ["(a)())()", ["(a)()()", "(a())()"]],
    [")(", [""]],
  ]
  if (testdata.length > 0) {
    tests = [[testdata[0], testdata[1]]]
  }
  ns.tprintf("Running tests:")
  tests.forEach((t) => ns.tprintf("%j", t))
  for (var t of tests) {
    var passed = true
    ns.tprintf("=== Balancing %s", t[0])
    var got = await solve(ns, t[0])
    var want = t[1]
    if (got.length != want.length) {
      passed = false
      ns.tprintf("======= FAILED length: got %d, want %d", got.length, want.length)
    }
    var extra = []
    var missing = []
    for (var g of got) {
      if (!want.includes(g)) {
        extra.push(g)
      }
    }
    for (var w of want) {
      if (!got.includes(w)) {
        missing.push(w)
      }
    }
    if (extra.length > 0) {
      passed = false
      ns.tprintf("======= FAILED got extra:")
      extra.forEach((e) => ns.tprintf("+ %s", e))
    }
    if (missing.length > 0) {
      passed = false
      ns.tprintf("======= FAILED missing:")
      missing.forEach((e) => ns.tprintf("0 %s", e))
    }
    if (passed) {
      ns.tprintf("======= PASSED")
    } else {
      ns.tprintf("======= FAILED")
    }
  }

  return
}
