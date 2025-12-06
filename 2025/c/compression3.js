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
  // return await test(ns)
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  var type = [
    "Compression II: LZ Decompression",
    "Compression III: LZ Compression",
  ].indexOf(c.type)
  type >= 0 || err(ns, "Wrong contract type: %s", c.type)
  var data = c.data
  var res = type == 0 ? await decompress(ns, data) : await compress(ns, data)
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

async function decompress(ns, data) {
  var res = ""
  while (data.length > 0) {
    await ns.asleep(10)
    // Block 1
    var l = Number(data[0])
    data = data.slice(1)
    res += data.slice(0, l)
    data = data.slice(l)
    // ns.tprintf("1: L=%d\ndata=%s\n res=%s", l, data, res)

    // Block 2
    l = Number(data[0])
    data = data.slice(1)
    if (l > 0) {
      var x = Number(data[0])
      // ns.tprintf("2: L=%d X=%d", l, x)
      data = data.slice(1)
      while (l-- > 0) {
        await ns.asleep(10)
        res += res[res.length-x]
        // ns.tprintf(" res=%s", res)
      }
    }
  }

  return res
}

async function compress(ns, data) {
  var res = ""
  var blocks = []
  // From the end, look for substrings up to 9 characters back
  //   If not found, add to literal block (up to 9)
  //     at 9, or when a match is found, push to blocks
  //   If found see how many more chars we can add
  //     at 9, or when we can't add any more, push to blocks
  // When out of input, add the remaining as a the last literal block,
  // then join all the blocks in reverse
  var block1 = ""
  while (data.length > 0) {
    await ns.asleep(10)
    var l = 2  // length
    var x = 0  // offset
    while (l < 9 && l < data.length-1) {
      await ns.asleep(10)
      ns.tprintf("examining %s, l=%d %j", data, l, data.slice(data.length-l))
      var block = data.slice(data.length-l)
      var lif = data.lastIndexOf(block, data.length-l-1)
      if (lif == -1) {
        l--
        break
      }
      if (lif >= Math.min(0, data.length-8-l)) {
        x = data.length-lif-l
        ns.tprintf("found %s at %d offset of %s", block, x, data)
      }
      l++
    }
    if (x > 0) {
      var extra = []
      while (block1.length > 0) {
        await ns.asleep(10)
        var l1 = Math.min(9, block1.length)
        ns.tprintf("Block 1: l=%d, enc=%s", l1, block1.slice(0, l1))
        extra.push([true, String(l1) + block1.slice(0,l1)])
        block1 = block1.slice(l1)
      }
      if (extra.length > 0) {
        extra.reverse()
        blocks.push(...extra)
      }
      ns.tprintf("Block 2: l=%d, x=%d, enc=%s", l, x, data.slice(data.length-l))
      blocks.push([false, [l, x].join("")])
      data = data.slice(0, data.length-l)
    } else {
      ns.tprintf("Adding to block 1: l=%d, enc=%s", l, data.slice(data.length-l))
      block1 = data.slice(data.length-l) + block1
      data = data.slice(0, data.length-l)
    }
  }
  var extra = []
  while (block1.length > 0) {
    await ns.asleep(10)
    l = Math.min(9, block1.length)
    ns.tprintf("Block 1: l=%d, enc=%s", l, block1.slice(0, l))
    extra.push([true, String(l) + block1.slice(0,l)])
    block1 = block1.slice(l)
  }
  if (extra.length > 0) {
    extra.reverse()
    blocks.push(...extra)
  }
  ns.tprintf("%j", blocks)
  var want = true
  while (blocks.length > 0) {
    await ns.asleep(10)
    var b = blocks.pop()
    if (b[0] != want) {
      res += "0"
    }
    res += b[1]
    want = !want
    ns.tprintf("+%s => %s", b, res)
  }

  return res
}

async function test(ns) {
  var tests = [
    ["abracadabra"    , "7abracad47"],
    ["mississippi"    , "4miss433ppi"],
    ["aAAaAAaAaAA"    , "3aAA53035"],
    ["2718281828"     , "627182844"],
    ["abcdefghijk"    , "9abcdefghi02jk"],
    ["aaaaaaaaaaaa"   , "3aaa91"],
    ["aaaaaaaaaaaaa"  , "1a91031"],
    ["aaaaaaaaaaaaaa" , "1a91041"],
  ]
  for (var t of tests) {
    ns.tprintf("======== Decoding %s", t[1])
    var res = await decompress(ns, t[1])
    if (res != t[0]) {
      ns.tprintf("======= FAILED:\n+%s\n-%s", res, t[0])
      return
    }
    ns.tprintf("======== Encoding %s", t[0])
    res = await compress(ns, t[0])
    var check = await decompress(ns, res)
    if (check != t[0]) {
      ns.tprintf("======= FAILED:\n+%s\n-%s", check, t[0])
      return
    }
    if (res.length > t[1].length) {
      ns.tprintf("======= FAILED:\n+%s\n-%s", res, t[1])
      return
    }
    ns.tprintf("======= PASSED")
  }

  return
}
