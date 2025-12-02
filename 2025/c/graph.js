/*
 * Proper 2-Coloring of a Graph
    You are attempting to solve a Coding Contract. You have 5 tries remaining,
    after which the contract will self-destruct.


    You are given the following data, representing a graph:
    [11,[[8,10],[1,9],[0,10],[0,4],[3,6],[6,7],[4,6],[2,10],[0,9],[5,8]]]

    Note that "graph", as used here, refers to the field of graph theory, and
    has no relation to statistics or plotting. The first element of the data
    represents the number of vertices in the graph. Each vertex is a unique
    number between 0 and 10. The next element of the data represents the edges
    of the graph. Two vertices u,v in a graph are said to be adjacent if there
    exists an edge [u,v]. Note that an edge [u,v] is the same as an edge [v,u],
    as order does not matter. You must construct a 2-coloring of the graph,
    meaning that you have to assign each vertex in the graph a "color", either
    0 or 1, such that no two adjacent vertices have the same color. Submit your
    answer in the form of an array, where element i represents the color of
    vertex i. If it is impossible to construct a 2-coloring of the given graph,
    instead submit an empty array.

    Examples:

    Input: [4, [[0, 2], [0, 3], [1, 2], [1, 3]]]
    Output: [0, 0, 1, 1]

    Input: [3, [[0, 1], [0, 2], [1, 2]]]
    Output: []


    If your solution is an empty string, you must leave the text box empty. Do
    not use "", '', or ``.
 */

import {err, flags} from "../contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  var f = flags(ns)
  var host = f._[0]
  var file = f._[1]

  var c = ns.codingcontract.getContract(file, host) || err(ns, "Can't get contract %s@%s", file, host)
  if (c.type != "Proper 2-Coloring of a Graph") {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  var data = c.data
  var res = await solve(ns, data)
  var msg = c.submit(res)
  if (f["toast"]) {
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprint(res)
    ns.tprint(msg)
  }
}

async function solve(ns, data) {
  // ns.tprint(data)
  var g = Array(data[0])
  for (var i=0; i<data[0]; i++) {
    g[i] = {id:i, color:-1, next:[]}
  }
  for (var n of data[1]) {
    g[n[0]].next.includes(n[1]) || g[n[0]].next.push(n[1])
    g[n[1]].next.includes(n[0]) || g[n[1]].next.push(n[0])
  }

  g[0].color = 0
  // g.forEach((n) => ns.tprint(n))
  var cont = true
  while (cont) {
    cont = false
    for (var node of g) {
      if (node.color == -1) {
        continue
      }
      await ns.asleep(10)
      var want = node.color ? 0 : 1
      for (var n of node.next) {
        if (g[n].color == -1) {
          // ns.tprintf("setting node %d to %d", n, want)
          g[n].color = want
          cont = true
        } else if (g[n].color != want) {
          // ns.tprintf("node %d conflicts", n)
          return []
        }
      }
    }
  }

  return g.map((n) => n.color)
}
