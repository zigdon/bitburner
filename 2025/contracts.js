import { dns } from "./hosts.js"
export var types = new Map([
    ["Algorithmic Stock Trader I", "/c/stock1.js"],
    ["Algorithmic Stock Trader II", "/c/stock1.js"],
    ["Algorithmic Stock Trader III", "/c/stock1.js"],
    ["Algorithmic Stock Trader IV", "/c/stock1.js"],
    ["Array Jumping Game II", "/c/jump.js"],
    ["Array Jumping Game", "/c/jump.js"],
    ["Compression I: RLE Compression", "/c/compression1.js"],
    ["Encryption I: Caesar Cipher", "/c/enc1.js"],
    ["Encryption II: Vigenère Cipher", "/c/enc2.js"],
    ["Find All Valid Math Expressions", "/c/math.js"],
    ["Find Largest Prime Factor", "/c/prime.js"],
    ["Generate IP Addresses", "/c/ip.js"],
    ["HammingCodes: Encoded Binary to Integer", "/c/bin.js"],
    ["Merge Overlapping Intervals", "/c/merge.js"],
    ["Minimum Path Sum in a Triangle", "/c/triangle.js"],
    ["Proper 2-Coloring of a Graph", "/c/graph.js"],
    ["Sanitize Parentheses in Expression", "/c/parens.js"],
    ["Square Root", "/c/sqrt.js"],
    ["Subarray with Maximum Sum", "/c/sumarray.js"], 
    // ["Total Ways to Sum", "/c/sum.js"],
    ["Unique Paths in a Grid I", "/c/grid2.js"],
    ["Unique Paths in a Grid II", "/c/grid2.js"],
  ])

/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]
  if (host == undefined) {
    var hosts = Array.from(dns(ns).values()).
      filter((h) => h.files.filter((f) => f.endsWith(".cct")).length > 0).
      map((h) => h.name)
    if (hosts.length > 0) {
      ns.tprint("Hosts with contracts:")
      hosts.forEach((h) => ns.tprintf("  %s", h))
    } else {
      ns.tprint("No hosts with contracts")
    }
    return
  }
  if (file == undefined) {
    var files = ns.ls(host, ".cct")
    if (files.length == 0) {
      err(ns, "No contracts found on ", host)
      return
    } else if (files.length > 1) {
      if (!fs["toast"]) {
        log(ns, "Found contracts:")
        files.forEach((f) => log(ns, "%s: %s", f, ns.codingcontract.getContract(f, host).type))
      }
      return
    }
    file = files[0]
  }

  var c = ns.codingcontract.getContract(file, host)
  if (types.has(c.type)) {
    if (fs["test"]) {
      file = ns.codingcontract.createDummyContract(c.type)
      host = "home"
      log(ns, "Created test contract: %s", file)
    }
    ns.run(types.get(c.type), 1, host, file, fs["toast"] ? "--toast" : "") ||
      err(ns, "Can't start %s", types.get(c.type))
    return
  }

  err(ns, "Unknown contract type %s", c.type)
  err(ns, "%s", c.description)
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  if (args[0] != undefined) {
    return [ ...data.servers.filter((h) => h.includes(args[0])) ]
  }
  return [...data.servers];
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 */
export function err(ns, tmpl, ...args) {
  ns.tprintf("*** %s error: "+tmpl, ns.getScriptName(), ...args)
}

/**
 * @param {NS} ns
 * @param {String} tmpl
 * @param {any} ...args
 */
export function log(ns, tmpl, ...args) {
  ns.tprintf(tmpl, ns.getScriptName(), ...args)
}

/**
 * @param {NS} ns
 * @return {_: String[], toast: Boolean, test: Boolean}
 */
export function flags(ns) {
  return ns.flags([
    ["test", false],
    ["toast", false],
  ])
}
