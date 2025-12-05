/*
 * Compression III: LZ Compression
    Lempel-Ziv (LZ) compression is a data compression technique which encodes
    data using references to earlier parts of the data. In this variant of LZ,
    data is encoded in two types of chunk. Each chunk begins with a length L,
    encoded as a single ASCII digit from 1 to 9, followed by the chunk data,
    which is either:

    1. Exactly L characters, which are to be copied directly into the
       uncompressed data.
    2. A reference to an earlier part of the uncompressed data. To do this, the
       length is followed by a second ASCII digit X: each of the L output
       characters is a copy of the character X places before it in the
       uncompressed data.

    For both chunk types, a length of 0 instead means the chunk ends
    immediately, and the next character is the start of a new chunk. The two
    chunk types alternate, starting with type 1, and the final chunk may be of
    either type.

    You are given the following input string:
        1T3f53g5uY2IoY2IoY2Q5vvvvvv5vvvvvv5vYTXrlrlrlrlrlrM6XlrlrlrM6XCZJlrM66gjhTTJhTTJh
    Encode it using Lempel-Ziv encoding with the minimum possible output
    length.

    Examples (some have other possible encodings of minimal length):
        abracadabra     ->  7abracad47
        mississippi     ->  4miss433ppi
        aAAaAAaAaAA     ->  3aAA53035
        2718281828      ->  627182844
        abcdefghijk     ->  9abcdefghi02jk
        aaaaaaaaaaaa    ->  3aaa91
        aaaaaaaaaaaaa   ->  1a91031
        aaaaaaaaaaaaaa  ->  1a91041
*/

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
  ].indexOf(c.type)
  type >= 0 || err(ns, "Wrong contract type: %s", c.type)
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

function solve(ns, data) {
  var res = ""
  var block = ""

  // read char by char.
  // check match of at least 2 in the previous 9 chars
  // If there isn't a match for 9, just dump out the block
  // If there is, dump out the prefix
  //
  // abracadabra     ->  7abracad47
  for (var c of data) {
    if (res.length < 1) {
      res += c
      continue
    }
    if (block.length < 1) {
      block += c
      continue
    }
    if (res.indexOf(block, Math.max(0, res.length-9)) > -1) {
      // as long as the next character still matches, and the total block 
      // is less than 9 chars, keep adding them in.
    }
  }

}
