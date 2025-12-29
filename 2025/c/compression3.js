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

import {init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var types = new Map([
    ["Compression II: LZ Decompression", decompress],
    ["Compression III: LZ Compression", compress],
  ])
  await init(ns, types, test, false)
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
    ns.printf("1: L=%d\ndata=%s\n res=%s", l, data, res)

    // Block 2
    l = Number(data[0])
    data = data.slice(1)
    if (l > 0) {
      var x = Number(data[0])
      ns.printf("2: L=%d X=%d", l, x)
      data = data.slice(1)
      while (l-- > 0) {
        await ns.asleep(10)
        res += res[res.length-x]
        ns.printf(" res=%s", res)
      }
    }
  }

  return res
}

async function compress(ns, data) {
  let c = await doCompress(ns, data, 2)
  /*
    for (let m=3; m<=4; m++) {
      let cm = await doCompress(ns, data, m)
      if (cm.length < c.length) {
        ns.printf("== m=%d is shorter!", m)
        ns.printf("== %s", cm)
        ns.printf("== %s", c)
        c=cm
      }
    }
  */
  return c
}

async function doCompress(ns, data, minblock=2) {
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
    var l = minblock  // length
    var x = 0  // offset
    while (l < 10 && l < data.length-1) {
      await ns.asleep(10)
      ns.printf("examining %s, l=%d %j", data, l, data.slice(data.length-l))
      var block = data.slice(data.length-l)
      var lif = data.lastIndexOf(block, data.length-l-1)
      // Not found, or found too far back
      if (lif == -1 || data.length-lif-l > 9) {
        l--
        break
      }
      if (lif >= Math.min(0, data.length-8-l)) {
        x = data.length-lif-l
        ns.printf("found %s at %d offset of %s", block, x, data)
      }
      l++
    }

    l = Math.min(l, 9)
    if (x > 0) { // There is block2 data to write
      var extra = []
      // Dump out any block1 we've collected
      while (block1.length > 0) {
        await ns.asleep(10)
        var l1 = Math.min(9, block1.length)
        ns.printf("Block 1: l=%d, enc=%s", l1, block1.slice(0, l1))
        extra.push([true, String(l1) + block1.slice(0,l1)])
        block1 = block1.slice(l1)
      }
      if (extra.length > 0) {
        extra.reverse()
        blocks.push(...extra)
      }

      // Check if the encoded length is actually shorter than writing a block1.
      // Encoded length is either 2 or 3 characters, depending on the previous block.
      // Writing a new block1 is 1+data, extending an earlier block1 is just data length.
      if (blocks.length > 0) {
        var b2l = 2
        var b1l = l
        var prev = blocks[blocks.length-1]
        if (!prev[0]) { // Are we following another block2?
          b2l++
        } else if (l+Number(prev[1][0]) >= 9) {
          // If we're following a block1, can we just add the data there?
          b1l++
        }
        if (b2l > b1l) {
          ns.printf("Wasteful block2: b2l=%d, b1l=%d", b2l, b1l)
          ns.printf("Adding to block 1: l=%d, enc=%s", l, data.slice(data.length-l))
          block1 = data.slice(data.length-l) + block1
          data = data.slice(0, data.length-l)
          continue
        }
      }

      ns.printf("Block 2: l=%d, x=%d, enc=%s", l, x, data.slice(data.length-l))
      blocks.push([false, [l, x].join(""), ns.sprintf("%d%s", l, data.slice(data.length-l))])
      data = data.slice(0, data.length-l)
    } else {  // No block 2, just add the constant
      ns.printf("Adding to block 1: l=%d, enc=%s", l, data.slice(data.length-l))
      block1 = data.slice(data.length-l) + block1
      data = data.slice(0, data.length-l)
    }
  }
  var extra = []
  // Write any remaining block1
  while (block1.length > 0) {
    await ns.asleep(10)
    l = Math.min(9, block1.length)
    ns.printf("Block 1: l=%d, enc=%s", l, block1.slice(0, l))
    extra.push([true, String(l) + block1.slice(0,l)])
    block1 = block1.slice(l)
  }
  if (extra.length > 0) {
    extra.reverse()
    blocks.push(...extra)
  }
  ns.printf("found: %j", blocks)

  // For each of the B2s, see what happens if we just put the raw B1 instead.
  let b2ids = blocks.map((b, i) => b[0] ? -1 : i).filter((id) => id>=0)
  ns.printf("B2 IDs: %j", b2ids)
  let balanced = await rebalance(ns, blocks)
  // ns.printf("rebalanced: %j", balanced)
  let best = await _connect(ns, balanced)
  for (let bid of b2ids.reverse()) {
    ns.printf("Swapping out #%d: %s -> %s", bid, blocks[bid][1], blocks[bid][2])
    let nb = await rebalance(ns, [
      ...blocks.slice(0,bid),
      [true, blocks[bid][2]], // Pretend this Block2 is a Block1 actually.
      ...blocks.slice(bid+1)])
    // ns.printf("newbalance: %j", nb)
    let res = await _connect(ns, nb)
    if (res.length < best.length) {
      ns.printf("%d < %d!", res.length, best.length)
      best = res
      blocks = nb
    } else {
      ns.printf("%d >= %d, keeping previous best", res.length, best.length)
    }
  }

  return best
}

// Try to merge consecutive B1s
async function rebalance(ns, blocks) {
  ns.printf("entering rebalancing: %j", blocks)
  let res = []
  let b1s = []
  for (let i=0; i<blocks.length; i++) {
    await ns.asleep(10)
    // ns.printf("rebalancing %j", blocks[i])
    if (blocks[i][0] == true) { // B1
      b1s.push(blocks[i])
    } else { // B2
      if (b1s.length > 0) {
        let b1blocks = []
        // ns.printf("b1s (mid): %j", b1s)
        let str = b1s.reverse().map((b) => b[1].slice(1)).join("")
        // ns.printf("b1 text: %j", str)
        b1s = []
        while (str.length > 9) {
          b1blocks.unshift([true, ns.sprintf("9%s", str.slice(0,9))])
          str = str.slice(9)
        }
        b1blocks.unshift([true, ns.sprintf("%d%s", str.length, str)])
        res.push(...b1blocks)
      }
      res.push(blocks[i])
    }
  }

  if (b1s.length > 0) {
    let b1blocks = []
    // ns.printf("b1s (end): %j", b1s)
    let str = b1s.reverse().map((b) => b[1].slice(1)).join("")
    // ns.printf("b1 text: %j", str)
    while (str.length > 9) {
      b1blocks.unshift([true, ns.sprintf("9%s", str.slice(0,9))])
      str = str.slice(9)
    }
    b1blocks.unshift([true, ns.sprintf("%d%s", str.length, str)])
    res.push(...b1blocks)
  }

  ns.printf("exiting rebalancing: %j", res)
  return res
}

async function _connect(ns, blocks) {
  // _connect the blocks alternating types. If the next block is the wrong type,
  // just add a '0' block.
  // Renamed to de-confuse the memory analyser
  var want = true
  let res = ""
  for (let bid=blocks.length-1; bid >= 0; bid--) {
    await ns.asleep(10)
    var b = blocks[bid]
    if (b[0] != want) {
      res += "0"
    } else {
      want = !want
    }
    res += b[1]
    // ns.printf("+%15s => %s", b, res)
  }

  return res
}

async function test(ns, testdata) {
  var tests = [
    ["abracadabra"    , "7abracad47"],
    ["mississippi"    , "4miss433ppi"],
    ["aAAaAAaAaAA"    , "3aAA43045"],  // 3aAA53035
    ["2718281828"     , "627182844"],
    ["abcdefghijk"    , "9abcdefghi02jk"],
    ["aaaaaaaaaaaa"   , "3aaa91"],
    ["aaaaaaaaaaaaa"  , "1a31091"], // 1a91031
    ["aaaaaaaaaaaaaa" , "1a41091"], // 1a91041
    [
      "MFTGuSFbL64xhhhhhhadoghhhhadoghhhhhhhhhhhhhhhehhhehhhjgzUnMlkynMlkylkynMlkyv3CeKryK",
      "9MFTGuSFbL0464xh514adog980510911e749jgzUnMlky550888v3CeKryK",
    ],
    [
      "nnZnKdKsnnZZZUteo3UtN0XWkErOWkErOWkkkkkkkkkkFfhSZk67Lq3Lq3Lq3L",
      "8nnZnKdKs387ZZUteo3258N0XWkErO750919FfhSZk67L02q373",
    ],
    [
      "p7Igl2IgWyj6tr0fH5Qo6o66o66oopQp6yTrG7yTrG7yTRrTrG7y7y7y7y7yy7y7y77iYTNpppppppppppp",
      "6p7Igl2249Wyj6tr0fH065Qo6o6539opQp6yTrG017752Rr5808206787iYTNppp91",
    ],
    [
      "uL7uhTmvXXXXXXXXXXjvYxbvbvbv6EcUN3EcUN3UN3UN3UfQ0gfffV6LVsWK6N42",
      "9uL7uhTmvX916jvYxbv4266EcUN3550739fQ0gfffV609LVsWK6N42",
    ],
  ]
  if (testdata.length > 0) {
    tests = [[testdata[0], testdata[1]]]
  }
  ns.tprintf("Running tests:")
  tests.forEach((t) => ns.tprintf("%j", t))
  for (var t of tests) {
    ns.tprintf("=== Decoding %s", t[1])
    var got = await decompress(ns, t[1])
    ns.tprintf("=== => %j", got)
    if (got != t[0]) {
      ns.tprintf("======= FAILED:\n+%s\n-%s", got, t[0])
      return
    }
    ns.tprintf("=== Encoding %s", t[0])
    got = await compress(ns, t[0])
    ns.tprintf("=== => %j", got)
    if (got != t[1]) {
      ns.tprintf("======= FAILED decompress:\n+%s\n-%s", got, t[1])
      return
    }
    var want = await decompress(ns, got)
    if (want != t[0]) {
      ns.tprintf("======= FAILED decompress:\n+%s\n-%s", want, t[0])
      return
    }
    if (got.length > t[1].length) {
      ns.tprintf("======= FAILED length:\n+%s\n-%s", got, t[1])
      return
    }
    ns.tprintf("======= PASSED")
  }

  return
}
