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
import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Encryption I: Caesar Cipher", solve],
  ])
  return await init(ns, types, undefined, false)
}

function solve(ns, data) {
  return caesar(ns, data[0], data[1])
}

/**
 * @param {NS} ns
 * @param {String} plain
 * @param {Number} shift
 * @return String
 */
function caesar(ns, plain, shift) {
  var alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var res = Array.from(plain).map((c) => c == " " ? " " : alpha[(alpha.indexOf(c)+alpha.length-shift) % alpha.length])
  return res.join("")
}
