/*
  Unique Paths in a Grid I
  You are in a grid with 11 rows and 9 columns, and you are positioned in the
  top-left corner of that grid. You are trying to reach the bottom-right corner
  of the grid, but you can only move down or right on each step. Determine how
  many unique paths there are from start to finish.

  NOTE: The data returned for this contract is an array with the number of rows and columns:

  [11, 9]

  Unique Paths in a Grid II
  You are located in the top-left corner of the following grid:

  0,0,1,0,0,0,
  0,0,1,1,0,0,
  1,0,0,0,1,0,
  0,0,1,0,0,0,
  0,0,0,0,0,0,
  0,0,1,0,0,0,
  0,0,0,0,0,1,
  0,0,0,0,0,0,
  0,0,0,0,0,0,

  You are trying reach the bottom-right corner of the grid, but
  you can only move down or right on each step. Furthermore,
  there are obstacles on the grid that you cannot move onto.
  These obstacles are denoted by '1', while empty spaces are
  denoted by 0.

  Determine how many unique paths there are from start to finish.

  NOTE: The data returned for this contract is an 2D array of numbers representing the grid.
*/

import {err, init} from "@/contracts.js"
/** @param {NS} ns */
export async function main(ns) {
  ns.ramOverride(16.9)
  var types = new Map([
    ["Unique Paths in a Grid I", s1],
    ["Unique Paths in a Grid II", s2],
  ])
  return init(ns, types, undefined, false)
}

async function s1(ns, data) {
  var grid = new Array(data[1]).fill(new Array(data[0]).fill(0))
  return solve(ns, grid)
}
async function s2(ns, data) {
  return solve(ns, data)
}

/** @param {Number[][]} data */
function solve(ns, data) {
  var count = 0
  if (data.length == 1 && data[0].length == 1 && data[0][0] == 0) {
    count += 1
  }
  // Move right
  if (data[0].length > 1 && data[0][1] == 0) {
    count = solve(ns, data.map((l) => l.slice(1)))
  }
  // Move down
  if (data.length > 1 && data[1][0] == 0) {
    count += solve(ns, data.slice(1))
  }

  return count
}
