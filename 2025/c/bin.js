/*
 * HammingCodes: Encoded Binary to Integer
    You are given the following encoded binary string: 
    '00100000100000000111100100101001' 

    - Decode it as an 'extended Hamming code' and convert it to a decimal
      value.
    - The binary string may include leading zeroes.
    - A parity bit is inserted at position 0 and at every position N where N is
      a power of 2.
    - Parity bits are used to make the total number of '1' bits in a given set
      of data even.
    - The parity bit at position 0 considers all bits including parity bits.
    - Each parity bit at position 2^N alternately considers 2^N bits then
      ignores 2^N bits, starting at position 2^N.
    - The endianness of the parity bits is reversed compared to the endianness
      of the data bits:
      - Data bits are encoded most significant bit first and the parity bits
        encoded least significant bit first.
      - The parity bit at position 0 is set last.
    - There is a ~55% chance for an altered bit at a random index.
    - Find the possible altered bit, fix it and extract the decimal value.

    Examples:
    '11110000' passes the parity checks and has data bits of 1000, which is 8
      in binary.
    '1001101010' fails the parity checks and needs the last bit to be corrected
      to get '1001101011', after which the data bits are found to be 10101,
      which is 21 in binary.

    For more information on the 'rule' of encoding, refer to Wikipedia
    (https://wikipedia.org/wiki/Hamming_code) or the 3Blue1Brown videos on
    Hamming Codes. (https://youtube.com/watch?v=X8jsijhllIA)
 * */

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
    "HammingCodes: Encoded Binary to Integer",
  ].indexOf(c.type)
  if (type == -1) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  // ns.tprint(c.description)
  var data = c.data
  var res = solve(ns, data)
  var msg = c.submit(res)
  
  if (fs["toast"]) {
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprint(data)
    ns.tprint(res)
    ns.tprint(msg)
  }
}

/**
 * @param {NS} ns
 * @param {String} data
 * */
function solve(ns, data) {
  ns.printf("              : %s", data)
  var ex = decode(ns, data)
  if (ex[0]) {
    return ex[1]
  }

  // Try flipping every bit until we're good
  for (var i=0; i<data.length; i++) {
    var fixed = data.slice(0,i) + (data[i] == "1" ? 0 : 1) + data.slice(i+1)
    ns.printf("Trying fix[%2d]: %s", i, fixed)
    ex = decode(ns, fixed)
    if (ex[0]) {
      return ex[1]
    }
  }
}

/**
 * @param {NS} ns
 * @param {String} data
 * */
function decode(ns, data) {
  var parity = []
  var payload = ""
  // bit 0 is a full parity of the entire string
  // [is, should be]
  var gparity = [data[0], getParity(data), data]
  for (var n=0; n**2<data.length; n++) {
    var block = getBlock(data, n)
    parity[n] = [data[n**2], getParity(block), block]
    payload += data.slice(2**n+1, 2**(n+1))
  }

  ns.printf("payload = %s", payload)
  ns.printf("global parity: %j", gparity)
  parity.forEach((p) => ns.print(p))

  return [gparity && parity.every((p) => p[1]), Number("0b"+payload)]
}

function getParity(data) {
  return Array.from(data).reduce(
    (a, i) => a+Number(i), 0
  ) % 2 == 0
}

/*
 * Each parity bit at position 2^N alternately considers 2^N bits then ignores
 * 2^N bits, starting at position 2^N.
 */
function getBlock(data, n) {
  var res = ""
  var size = 2**n
  for (var i=0; i*size < data.length; i+=2) {
    res += data.slice(size+i*size, 2*size+i*size)
  }
  return res
}
