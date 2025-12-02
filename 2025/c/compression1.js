/*
 * Compression I: RLE Compression

  Run-length encoding (RLE) is a data compression technique which encodes data
  as a series of runs of a repeated single character. Runs are encoded as a
  length, followed by the character itself. Lengths are encoded as a single
  ASCII digit; runs of 10 characters or more are encoded by splitting them into
  multiple runs.

  You are given the following input string:
      vvooBBwFFFFFFFFFFFFWW22u888NYYYYeek77MMMMM77777777HHHHHHHHGRRRRRRRRRFFrrbbRR44
  Encode it using run-length encoding with the minimum possible output length.

  Examples:

      aaaaabccc            ->  5a1b3c
      aAaAaA               ->  1a1A1a1A1a1A
      111112333            ->  511233
      zzzzzzzzzzzzzzzzzzz  ->  9z9z1z  (or 9z8z2z, etc.)


  If your solution is an empty string, you must leave the text box empty. Do
  not use "", '', or ``.
*/

import {err, flags} from "/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  if (c.type != "Compression I: RLE Compression") {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  var data = c.data
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

async function solve(ns, data) {
  // ns.tprint(data)
  var res = ""
  var count = 0
  var last = ""
  for (var c of data) {
    if (c != last || count == 9) {
      if (last != "") {
        res += ns.sprintf("%d%s", count, last)
      }
      last = c
      count = 0
    } if (c == last) {
      count++
    }
  }
  res += ns.sprintf("%d%s", count, last)

  return res
}
