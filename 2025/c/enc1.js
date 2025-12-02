import {err} from "/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  /*
   * Encryption I: Caesar Cipher
      Caesar cipher is one of the simplest encryption technique. It is a type
      of substitution cipher in which each letter in the plaintext  is replaced
      by a letter some fixed number of positions down the alphabet. For
      example, with a left shift of 3, D would be replaced by A,  E would
      become B, and A would become X (because of rotation).

      You are given an array with two elements:
        ["LOGIC MACRO SHELL CLOUD MEDIA", 13]
      The first element is the plaintext, the second element is the left shift value.

      Return the ciphertext as uppercase string. Spaces remains the same.
  */

  var host = ns.args[0]
  var file = ns.args[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  c.type == "Encryption I: Caesar Cipher" || err(ns, "Wrong contract type: %s", c.type)
  // ns.tprint(c.description)
  var plaintext = c.data[0]
  var shift = c.data[1]
  ns.tprint(c.data)
  var res = solve(ns, plaintext, shift)
  ns.tprint(res)
  ns.tprint(c.submit(res))
}

/**
 * @param {NS} ns
 * @param {String} plain
 * @param {Number} shift
 * @return String
 */
function solve(ns, plain, shift) {
  var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  ns.tprint(alpha)
  var res = Array.from(plain).map((c) => c == " " ? " " : alpha[(alpha.indexOf(c)+alpha.length-shift) % alpha.length])
  return res.join("")
}
