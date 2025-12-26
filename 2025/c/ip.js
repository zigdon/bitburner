/*
Generate IP Addresses
Given the following string containing only digits, return an array with all
possible valid IP address combinations that can be created from the string:

  24212784125

  Note that an octet cannot begin with a '0' unless the number itself is exactly
  '0'. For example, '192.168.010.1' is not a valid IP.

  Examples:

  25525511135 -> ["255.255.11.135", "255.255.111.35"]
  1938718066 -> ["193.87.180.66"]
*/

import {err, init} from "@/contracts.js"
import {diff} from "@/lib/util.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Generate IP Addresses", solve],
  ])
  return init(ns, types, test, false)
}

function solve(ns, data) {
  return ip(ns, data, 4)
}

/**
 * @param {NS} ns
 * @param {String} data
 * @param {Number} octets
 * @return String[]
 */
function ip(ns, data, octets) {
  var res = []
  // If we just have too many digits, we don't have a valid solution.
  if (data.length > octets*3) {
    return []
  }
  // If we are out of digits, make sure we're out of charactes too.
  if (octets == 1) {
    if (data.length == 0 || data > 256) { return [-1] }
    return [data]
  }

  // If we're out of digits, but need more octets, remove the path.
  if (data == "" && octets > 0) {
    return [-1]
  }

  ns.printf("Adding %s * ip(%s, %d)", data[0], data.slice(1), octets-1)
  res.push(...mult(data[0], ip(ns, data.slice(1), octets-1)))
  ns.printf("Adding %s * ip(%s, %d)", data.slice(0,2), data.slice(2), octets-1)
  res.push(...mult(data.slice(0, 2), ip(ns, data.slice(2), octets-1)))
  if (Number(data.slice(0,3)) < 256) {
    ns.printf("Adding %s * ip(%s, %d)", data.slice(0,3), data.slice(3), octets-1)
    res.push(...mult(data.slice(0, 3), ip(ns, data.slice(3), octets-1)))
  }

  // Filter out all leading 0x, 0xx
  res = res.filter(
    (r) => r.split('.').every((o) => o == "0" || o[0] != "0")
  )

  ns.printf("input=[%j,%d], res=%j", data, octets, res)

  return res
}

/**
 * @param {String} a
 * @param {String[]} b
 */
export function mult(a, b) {
  var res = []
  if (b.includes(-1)) {
    return []
  }

  for (var i of b) {
    res.push(a+"."+i)
  }

  return res
}

async function test(ns, testdata) {
  var tests = [
    ['171141140169', ['171.141.140.169']],
  ]
  if (testdata.length > 0) {
    tests = [[testdata[0], testdata[1]]]
  }
  ns.tprintf("Running tests:")
  tests.forEach((t) => ns.tprintf("%j", t))
  for (var t of tests) {
    var passed = true
    ns.tprintf("=== Finding IPs in %s", t[0])
    var got = ip(ns, t[0], 4)
    var d = diff(ns, t[1], got)
    if (d != "") {
      passed = false
      ns.tprintf("=== Diff found:\n%s", d)
    }

    if (passed) {
      ns.tprintf("======= PASSED")
    } else {
      ns.tprintf("======= FAILED")
    }
  }

  return
}
