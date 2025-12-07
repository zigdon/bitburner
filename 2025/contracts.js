import { dns } from "@/hosts.js"
import { table } from "@/table.js"
import { info } from "@/log.js"
export var types = new Map([
    ["Algorithmic Stock Trader I", "/c/stock1.js"],
    ["Algorithmic Stock Trader II", "/c/stock1.js"],
    ["Algorithmic Stock Trader III", "/c/stock1.js"],
    ["Algorithmic Stock Trader IV", "/c/stock1.js"],
    ["Array Jumping Game II", "/c/jump.js"],
    ["Array Jumping Game", "/c/jump.js"],
    ["Compression I: RLE Compression", "/c/compression1.js"],
    ["Compression II: LZ Decompression", "/c/compression3.js"],
    ["Compression III: LZ Compression", "/c/compression3.js"],
    ["Encryption I: Caesar Cipher", "/c/enc1.js"],
    ["Encryption II: Vigenère Cipher", "/c/enc2.js"],
    ["Find All Valid Math Expressions", "/c/math.js"],
    ["Find Largest Prime Factor", "/c/prime.js"],
    ["Generate IP Addresses", "/c/ip.js"],
    ["HammingCodes: Encoded Binary to Integer", "/c/bin.js"],
    ["HammingCodes: Integer to Encoded Binary", "/c/bin.js"],
    ["Merge Overlapping Intervals", "/c/merge.js"],
    ["Minimum Path Sum in a Triangle", "/c/triangle.js"],
    ["Proper 2-Coloring of a Graph", "/c/graph.js"],
    ["Sanitize Parentheses in Expression", "/c/parens.js"],
    ["Spiralize Matrix", "/c/spiral.js"],
    ["Square Root", "/c/sqrt.js"],
    ["Subarray with Maximum Sum", "/c/sumarray.js"], 
    ["Total Ways to Sum", "/c/sum.js"],
    ["Unique Paths in a Grid I", "/c/grid2.js"],
    ["Unique Paths in a Grid II", "/c/grid2.js"],
  ])

/** @param {NS} ns */
export async function main(ns) {
  var fs = flags(ns)
  var host = fs._[0]
  var file = fs._[1]
  if (host == undefined) {
    return listContracts(ns)
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
  if (!types.has(c.type)) {
    err(ns, "Unknown contract type %s", c.type)
    err(ns, "%s", c.description)
    return
  }
  if (fs["check"]) {
    err(ns, "%s", c.description)
    err(ns, "%d attempts remaining", c.numTriesRemaining)
    return
  }
  var code = types.get(c.type)

  if (fs["test"]) {
    file = ns.codingcontract.createDummyContract(c.type)
    host = "home"
    log(ns, "Created test contract: %s", file)
  }

  // Check if we have enough memory available.
  if (ns.getScriptRam(code) > ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) {
    var msg = ns.sprintf(
      "Can't start %s, needs %s but only have %s available",
      code, ns.formatRam(ns.getScriptRam(code)),
      ns.formatRam(ns.getServerMaxRam("home") - ns.getServerUsedRam("home")))
    if (fs["toast"]) {
      ns.print(msg)
    } else {
      ns.tprintf(msg)
    }
    return
  }

  // Before starting, make sure there isn't already an instance running.
  if (!fs["force"] &&
      ns.ps().filter(
        (p) => p.filename == code &&
                p.args[0] == host &&
                p.args[1] == file).length > 0) {
    var msg = ns.sprintf("Already have an instance of %s running on %s@%s", c.type, file, host)
    ns.print(msg)
    if (!fs["toast"]) {
      ns.tprintf(msg)
    }
    return
  }
  if (fs["debug"]) {
    var pid = ns.run(code, 1, host, file)
    ns.ui.openTail(pid)
    return
  }
  if (host == "home" || fs["force"] || !blocked(ns, c.type)) {
    if (ns.run(code, 1, host, file, (fs["toast"] ? "--toast" : ""), (fs["debug"] ? "--tail" : ""))) {
      if (blocked(ns, c.type)) {
        unblock(ns, c.type)
      }
    } else {
      err(ns, "Can't start %s", code)
      block(ns, c.type)
    }
  } else {
    ns.print("Skipping blocked contract: "+ c.type)
    if (!fs["toast"]) {
      ns.toast("Skipping blocked contract: "+ c.type, "warning")
    }
  }
  return
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
  ns.printf(tmpl, ...args)
}

/**
 * @param {NS} ns
 * @return {_: String[], toast: Boolean, test: Boolean}
 */
export function flags(ns) {
  return ns.flags([
    ["test", false],
    ["toast", false],
    ["force", false],
    ["debug", false],
    ["check", false],
  ])
}

export function blocked(ns, type) {
  var data = state(ns)
  return data.includes(type)
}

export function block(ns, type) {
  var data = state(ns)
  if (!data.includes(type)) {
    data.push(type)
    ns.toast(ns.sprintf("Blocking contract type %s", type), "warning")
    save(ns, data)
  }
}

export function unblock(ns, type) {
  var data = state(ns)
  var updated = data.filter((t) => t != type)
  ns.printf("%j", data)
  if (data.length != updated.length) {
    ns.printf("%j", updated)
    ns.printf("Unblocking %s, %d still blocked", type, updated.length)
    ns.toast(ns.sprintf("Unblocking %s, %d still blocked", type, updated.length))
    save(ns, updated)
  }
}

function state(ns) {
  if (ns.fileExists("/data/contracts.json")) {
    return JSON.parse(ns.read("/data/contracts.json"))
  }
  return []
}

function save(ns, data) {
  ns.write("/data/contracts.json", JSON.stringify(data), "w")
}

/*
 * @param {NS} ns
 * @param {Map} types
 * @param {function({NS}, {Number[]})} testfn
 * @param {Boolean} nosubmit
 */
export async function init(ns, types, testfn, nosubmit) {
  var fs = flags(ns)
  ns.clearLog()
  ns.disableLog("asleep")
  if (fs["test"]) {
    if (testfn == undefined) {
      ns.tprint("No tests defined")
      return
    }
    ns.tprint("Running tests")
    return await testfn(ns, fs._)
  }
  var host = fs._[0]
  var file = fs._[1]

  var c = ns.codingcontract.getContract(file, host)
  if (!c) {
    err(ns, "Can't get contract %s@%s", file, host)
    return
  }

  if (!types.has(c.type)) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }
  ns.printf("type=%s", c.type)
  var fn = types.get(c.type)
  var data = c.data
  ns.printf("data=%j", data)
  var res = await fn(ns, data)
  var msg = nosubmit ? "Not submitted" : c.submit(res)
  msg ||= ns.sprintf("Contract failed, %d attempts remaining", c.numTriesRemaining)
  if (fs["toast"]) {
    ns.printf("Input data:\n%j", data)
    ns.print(res)
    ns.print(msg)
    ns.toast(msg)
  } else {
    ns.tprintf("Input data:\n%j", data)
    ns.tprint(data)
    ns.tprint(res)
    ns.tprint(msg)
  }

  info(ns, "Attempted to solve contract %s: %s", c.type, msg)
}

function listContracts(ns) {
  var hosts = Array.from(dns(ns).values()).
    filter((h) => h.files.filter((f) => f.endsWith(".cct")).length > 0)
  if (hosts.length > 0) {
    ns.tprintf("Hosts with contracts:")
    var data = []
    hosts.map(
      (h) => h.files.filter(
        (f) => f.endsWith(".cct")
      ).filter(
        (f) => ns.fileExists(f, h.name)
      ).forEach(
        (f) => data.push(
          [h.name, f, ns.codingcontract.getContractType(f, h.name)])
      ))
    // ns.tprint(data)
    // data.forEach((l) => ns.tprint(l))
    ns.tprint(table(ns, ["Host", "Filename", "Type"], data))
  } else {
    ns.tprint("No hosts with contracts")
  }
  return
}
