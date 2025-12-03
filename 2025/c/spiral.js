/*
 * Spiralize Matrix
    Given the following array of arrays of numbers representing a 2D matrix,
    return the elements of the matrix as an array in spiral order:

    [
        [13,35]
        [33,47]
        [37,16]
        [14,41]
        [29,23]
        [47,16]
    ]

    Here is an example of what spiral order should be:

     [
         [1, 2, 3]
         [4, 5, 6]
         [7, 8, 9]
     ]

    Answer: [1, 2, 3, 6, 9, 8 ,7, 4, 5]

    Note that the matrix will not always be square:

     [
         [1,  2,  3,  4]
         [5,  6,  7,  8]
         [9, 10, 11, 12]
     ]

    Answer: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
 */

import {err, flags} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  if (f["toast"]) {
    ns.toast("spiral disabled")
    return
  }
  if (c.type != "Spiralize Matrix") {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  // ns.tprint(c.description)
  var data = c.data
  var res = solve(ns, data)
  if (!res) {
    ns.tprintf("Failed to solve %s@%s", file, host)
    return
  }
  if (f["toast"]) {
    ns.toast(c.submit(res))
  } else {
    ns.tprint(data)
    ns.tprint(res)
    // ns.tprint(c.submit(res))
  }
}

function solve(ns, data) {
  var tl = {x:0, y:0}
  var br = {x:data[0].length-1, y:data.length-1}
  var dir = {n: "r", h:1, v:0}
  var pos = {x:0, y:0}
  var res = []
  var failsafe = data[0].length * data.length
  data.forEach((l) => ns.tprint(l))
  ns.tprintf("tl:%j br:%j dir:%j pos:%j", tl, br, dir, pos)
  while (failsafe-- > 0) {
    res.push(data[pos.y][pos.x])
    var next = {x:pos.x+dir.x, y:pos.y+dir.y}
    if (next.x > br.x || next.y > br.y || next.x < tl.x || next.y < tl.y) {
      switch (dir.n) {
        case "r":
          tl.y+=1
          dir = {n:"d", x:0, y:1}
          break
        case "d":
          br.x-=1
          dir = {n:"l", x:-1, y:0}
          break
        case "l":
          br.y-=1
          dir = {n:"u", x:0, y:-1}
          break
        case "u":
          tl.x+=1
          dir = {n:"r", x:1, y:0}
          break
      }
      if (tl.x > br.x || tl.y > br.y) {
        return res
      }
      next = {x:pos.x+dir.x, y:pos.y+dir.y}
    }
    pos = next
  }
}
