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

import {init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    [ "HammingCodes: Encoded Binary to Integer", decode ],
    [ "HammingCodes: Integer to Encoded Binary", encode ],
  ])
  return init(ns, types, test, false)
}

/**
 * @param {NS} ns
 * @param {String} data
 * */
function encode(ns, data) {
  var bin = ns.sprintf("%b", data)
  ns.printf("%d => %s", data, bin)

  // Add 0s for all the parity bits
  var res = "0"
  var next = 1
  var guide = "p"
  for (var b of bin) {
    // If n is a power of 2, add a 0 bit
    while (res.length == next) {
      ns.printf("parity bit at %d", next)
      next*=2
      res += "0"
      guide += "p"
    }
    res += b
    guide += "-"
  }
  ns.printf("          %s",
    Array(res.length).fill(0).map(
      (_, i) => Math.floor((i/10))%10
    ).map(
      (n) => n == 0 ? " " : n
    ).join(""))
  ns.printf("          %s", Array(res.length).fill(0).map((_, i) => i%10).join(""))
  ns.printf("padded => %s", res)
  ns.printf(" pbits => %s", guide)

  // Get each parity block, calculate the parity bits
  for (var n = Math.floor(Math.sqrt(res.length))-1; n >=0; n--) {
    var block = getBlock(res, n)
    // If the current parity is correct, leave it as 0, otherwise, flip
    var p = getParity(block) ? "0" : "1"
    ns.printf("%d(%d): %s => %s", n, 2**n, block, p)

    // Parity bit for block n is stored in bit 2**n
    res = res.slice(0, 2**n) + String(p) + res.slice(2**n+1)
    ns.printf("      => %s", res)
  }

  // Global parity bit
  var gp = getParity(res) ? "0" : "1"
  res = gp + res.slice(1)
  ns.printf("      => %s", res)

  return res
}

/**
 * @param {NS} ns
 * @param {String} data
 * */
function decode(ns, data) {
  ns.printf("              : %s", data)
  var ex = validate(ns, data)
  if (ex[0]) {
    return ex[1]
  }

  // Try flipping every bit until we're good
  for (var i=0; i<data.length; i++) {
    var fixed = data.slice(0,i) + (data[i] == "1" ? 0 : 1) + data.slice(i+1)
    ns.printf("Trying fix[%2d]: %s", i, fixed)
    ex = validate(ns, fixed)
    if (ex[0]) {
      return ex[1]
    }
  }
}

/**
 * @param {NS} ns
 * @param {String} data
 * */
function validate(ns, data) {
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

// Returns true if the parity bit is correct, false if it needs flipped.
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

async function test(ns, testdata) {
  var tests = [
    [21, '1001101010', false],
    [21, '1001101011', true],
  ]
  if (testdata.length > 0) {
    tests = [[testdata[0], testdata[1]]]
  }
  ns.tprintf("Running tests:")
  tests.forEach((t) => ns.tprintf("%j", t))
  for (var t of tests) {
    var passed = true
    ns.tprintf("=== Decoding %s", t[1])
    var got = await decode(ns, t[1])
    ns.tprintf("=== => %j", got)
    if (got != t[0]) {
      ns.tprintf("======= FAILED:\n+%s\n-%s", got, t[0])
      passed = false
    }
    if (!t[2]) {
      continue
    }
    ns.tprintf("=== Encoding %s", t[0])
    got = await encode(ns, t[0])
    ns.tprintf("=== => %j", got)
    var want = await decode(ns, got)
    if (want != t[0]) {
      ns.tprintf("======= FAILED decode:\n+%s\n-%s", want, t[0])
      passed = false
    }
    if (passed) {
      ns.tprintf("======= PASSED")
    } else {
      ns.tprintf("======= FAILED")
    }
  }

  return
}
