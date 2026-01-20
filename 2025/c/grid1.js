/*
 * Shortest Path in a Grid
  You are located in the top-left corner of the following grid:

    [[0,0,1,0,0,0,0,0,0,1],
    [0,0,0,0,0,1,0,1,1,1],
    [1,0,1,0,0,0,1,0,1,0],
    [1,0,0,1,0,0,0,1,1,0],
    [0,0,0,1,1,0,1,0,1,0],
    [1,0,0,0,0,0,1,0,0,1],
    [0,1,0,0,1,0,0,0,0,0],
    [1,1,0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,1,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,0,0,1,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0]]

  You are trying to find the shortest path to the bottom-right corner of the
  grid, but there are obstacles on the grid that you cannot move onto. These
  obstacles are denoted by '1', while empty spaces are denoted by 0.

  Determine the shortest path from start to finish, if one exists. The answer
  should be given as a string of UDLR characters, indicating the moves along
  the path

  NOTE: If there are multiple equally short paths, any of them is accepted as
  answer. If there is no path, the answer should be an empty string.
  NOTE: The data returned for this contract is an 2D array of numbers
  representing the grid.

  Examples:

      [[0,1,0,0,0],
        [0,0,0,1,0]]

  Answer: 'DRRURRD'

      [[0,1],
        [1,0]]

  Answer: ''
*/

import {init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  var types = new Map([
    [ "Shortest Path in a Grid", solve ],
  ])
  return init(ns, types, undefined, false)
}

async function solve(ns, data) {
  // data.forEach((l) => ns.tprintf(l.join("")))
  var paths = Array(data.length)
  for (var n=0; n<paths.length; n++) {
    paths[n] = Array(data[0].length)
  }
  // Valid options are 0 on the board, and never been visited before i.e. path=""
  const opts = (x,y) => {
    // ns.tprintf("Looking for options from %d,%d", x, y)
    let res = []
    for (let dir of "UDLR") {
      let [dx, dy] = [0, 0]
      switch (dir) {
        case "U":
          dy=-1
          break
        case "D":
          dy=1
          break
        case "L":
          dx=-1
          break
        case "R":
          dx=1
          break
      }
      let nx = x+dx
      let ny = y+dy
      // ns.tprintf("Checking %s -> %d,%d: %j %j",
      //   dir, nx, ny, paths[ny]?.[nx], data[ny]?.[nx])
      if (paths[ny]?.[nx] == undefined && data[ny]?.[nx] == 0) {
        paths[ny][nx] = paths[y][x]+dir
        // ns.tprintf("  adding %s to %d,%d (%j)", dir, nx, ny, paths[ny][nx])
        res.push({x: nx, y: ny})
      }
    }

    // ns.tprintf("options: %j", res)
    return res
  }

  var dest = {x:data[0].length-1, y: data.length-1}
  var todo = []
  paths[0][0] = ""
  todo.push(...opts(0,0))
  while (todo.length > 0) {
    await ns.asleep(10)
    // paths.forEach((l) => ns.tprint(l))
    let next = todo.shift()
    ns.printf("Moving to %j", next)
    if (next.x == dest.x && next.y == dest.y) {
      break
    }
    todo.push(...opts(next.x, next.y))
    ns.printf("")
    data.forEach(
      (l, x) => ns.print(l.map(
        (c, y) => c == 1 ? " x" 
        : ns.sprintf("%2s", paths[x][y]?.length ?? 0)).join("")))
  }

  return paths[dest.y][dest.x] ?? ""

}
