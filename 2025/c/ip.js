import {err} from "/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
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

  var host = ns.args[0]
  var file = ns.args[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Generate IP Addresses" || err(ns, "Wrong contract type: %s", c.type)
  // ns.tprint(c.description)
  var data = c.data
  ns.tprint(data)
  var res = solve(ns, data, 4)
  if (!res) {
    ns.tprintf("Failed to solve %s@%s", file, host)
  }
  ns.tprint(res)
  ns.tprint(c.submit(res))
}

/**
 * @param {NS} ns
 * @param {String} data
 * @param {Number} octets
 * @return String[]
 */
function solve(ns, data, octets) {
  var res = []
  // If we are out of digits, make sure we're out of charactes too.
  if (octets == 1) {
    if (data.length == 0 || data > 256) { return [-1] }
    return [data]
  }

  // If we're out of digits, but need more octets, remove the path.
  if (data == "" && octets > 0) {
    return [-1]
  }

  res.push(...mult(data[0], solve(ns, data.substring(1), octets-1)))
  // Leading 0 can only be a "0"
  if (data[0] != "0") {
    res.push(...mult(data.substring(0, 2), solve(ns, data.substring(2), octets-1)))
    if (data.substring(0,3) < 256) {
      res.push(...mult(data.substring(0, 3), solve(ns, data.substring(3), octets-1)))
    }
  }

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
