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

import {init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  var types = new Map([
    [ "Spiralize Matrix", solve ],
  ])
  return init(ns, types, undefined, false)
}

function solve(ns, data) {
  var tl = {x:0, y:0}
  var br = {x:data[0].length-1, y:data.length-1}
  var dir = {n: "r", x:1, y:0}
  var pos = {x:0, y:0}
  var res = []
  var failsafe = data[0].length * data.length
  // data.forEach((l) => ns.tprint(l))
  // ns.tprintf("tl:%j br:%j dir:%j pos:%j", tl, br, dir, pos)
  while (failsafe-- > 0) {
    // ns.tprint(pos)
    // ns.tprint(dir)
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
    // ns.tprintf("moved %s from %j to %j", dir.n, pos, next)
    pos = next
  }
}
