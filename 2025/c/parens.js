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

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
    "Sanitize Parentheses in Expression",
  ].indexOf(c.type)
  if (type == -1) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  // ns.tprint(c.description)
  var data = c.data
  // var data = "()())()" 
  // var data = "(a)())()" 
  ns.tprint(data)
  var res = await solve(ns, data)
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
 * @param {NS} ns
 * @param {String} data
 */
async function solve(ns, data) {
  var res = []
  ns.print(data)
  // If we don't have both ( and ), remove all of them
  if (data.indexOf("(") == -1 || data.indexOf(")") == -1) {
    // ns.tprintf("No parens in %s", data)
    return [data.replaceAll(/[()]/g, "")]
  }
  // Trim the ends that are always invalid
  while (data.indexOf(")") < data.indexOf("(")) {
    ns.printf("Trimming ')' from %s", data)
    await ns.asleep(10)
    data = data.replace(")", "")
  }
  while (data.lastIndexOf("(") > data.lastIndexOf(")")) {
    ns.printf("Trimming '(' from %s", data)
    await ns.asleep(10)
    data = data.substring(0, data.lastIndexOf("(")) + data.substring(1+data.lastIndexOf("("))
  }

  // Check if we're good
  var valid = checkValid(ns, data)
  if (valid[1] == -1) {
    // ns.tprintf("%s is good", data)
    return [data]
  }
  var fi = valid[1]
  var extra = valid[0]

  // ns.tprintf("Removing %s from %s", extra, data)
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
      // ns.tprintf("Worse: %s -> %s (%d<%d)", data, removed, valid[1], fi)
      continue
    }
    // ns.tprintf("Removing %s from %s -> %s", extra, data, removed)
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
