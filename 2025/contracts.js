import { dns } from "@/hosts.js"
import { table } from "@/table.js"
import { warning, info } from "@/log.js"
import { nsRPC } from "@/lib/nsRPC.js"

export let types = new Map([
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
    ["Shortest Path in a Grid", "/c/grid1.js"],
    ["Spiralize Matrix", "/c/spiral.js"],
    ["Square Root", "/c/sqrt.js"],
    ["Subarray with Maximum Sum", "/c/sumarray.js"], 
    ["Total Ways to Sum", "/c/sum.js"],
    ["Total Ways to Sum II", "/c/sum2.js"],
    ["Unique Paths in a Grid I", "/c/grid2.js"],
    ["Unique Paths in a Grid II", "/c/grid2.js"],
  ])

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(18.4)
  /** @type {NS} ns */
  let ns = new nsRPC(ons)
  let fs = flags(ns)
  let host = fs._[0]
  let file = fs._[1]
  ns.disableLog("getServerMaxRam")
  ns.disableLog("getServerUsedRam")
  ns.disableLog("asleep")
  if (host == undefined) {
    return await listContracts(ns, fs)
  }

  if (file == undefined || String(file).match(/^[0-9]+$/)) {
    let files = ns.ls(host, ".cct")
    ns.printf("Contracts found: %j", files)
    if (files.length == 0) {
      err(ns, "No contracts found on ", host)
      return
    } else if (files.length > 1) {
      let cct = await ns.codingcontract.getContractType(f, host)
      if (fs["toast"]) {
        log(ns, "Found contracts:")
        files.forEach((f) => log(ns, "%s: %s", f, cct))
        return
      } else {
        ns.tprint("Found contracts:")
        files.forEach((f, n) => ns.tprintf("%d. %s: %s", n+1, f, cct))
        if (Number(file) > 0 && Number(file) <= files.length) {
          ns.tprintf("Selecting %j", file)
          file = files[Number(file)-1]
          ns.printf("Selected %s", file)
        } else {
          return
        }
      }
    } else {
      file = files[0]
    }
  }

  ns.printf("Reading %s@%s", file, host)
  let c = await ns.codingcontract.getContract(file, host)
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
  let code = types.get(c.type)

  if (fs["test"]) {
    file = await ns.codingcontract.createDummyContract(c.type)
    host = "home"
    log(ns, "Created test contract: %s", file)
  }

  // Check if we have enough memory available.
  if (ns.getScriptRam(code) > ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) {
    let msg = ns.sprintf(
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
    let msg = ns.sprintf("Already have an instance of %s running on %s@%s", c.type, file, host)
    ns.print(msg)
    if (!fs["toast"]) {
      ns.tprintf(msg)
    }
    return
  }
  if (fs["debug"]) {
    let pid = ns.run(code, 1, host, file)
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
      await info(ns, "Skipping blocked contract: %s", c.type)
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
    ["all", false],
    ["test", false],
    ["toast", false],
    ["force", false],
    ["debug", false],
    ["check", false],
    ["autotest", ""],
    ["limit", 100],
  ])
}

export function blocked(ns, type) {
  let data = state(ns)
  return data.includes(type)
}

export async function block(ns, type) {
  let data = state(ns)
  if (!data.includes(type)) {
    data.push(type)
    ns.toast(ns.sprintf("Blocking contract type %s", type), "warning")
    await warning(ns, "Blocking contract type %s", type)
    save(ns, data)
  }
}

export async function unblock(ns, type) {
  let data = state(ns)
  let updated = data.filter((t) => t != type)
  ns.printf("%j", data)
  if (data.length != updated.length) {
    ns.printf("%j", updated)
    ns.printf("Unblocking %s, %d still blocked", type, updated.length)
    ns.toast(ns.sprintf("Unblocking %s, %d still blocked", type, updated.length))
    await info(ns, "Unblocking %s, %d still blocked", type, updated.length)
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

async function record(ns, type, msg) {
  let data = {valid: true, log: []}
  if (ns.fileExists("/data/contractHistory.json")) {
    data = JSON.parse(ns.read("/data/contractHistory.json"))
    if (!data?.valid) {
      await warning(ns, "Saved contract history invalid!")
      return
    }
  }
  let bounty = 0
  let rep = 0
  let facts = []
  if (msg.includes("Gained $")) {
    bounty = msg.split("$")[1]
    let suf = bounty[bounty.length-1]
    bounty = parseFloat(bounty)
    if (suf == "m") bounty *= 1e6
    else if (suf == "b") bounty *= 1e9
    else if (suf == "t") bounty *= 1e12
    else await warning(ns, "Unknown bounty suffix %s in %s", suf, msg)
  } else if (msg.includes("reputation")) {
    rep = parseInt(msg.split(" ")[1])
    if (msg.includes(":"))
      facts.push(...msg.split(": ")[1].split(", "))
    else
      facts.push(...msg.split("reputation for ")[1])
  }

  data.log.push({ts: Date.now(), type: type, msg: msg, bounty: bounty, rep: rep, factions: facts})
  ns.write("/data/contractHistory.json", JSON.stringify(data), "w")
}

/*
 * @param {NS} ons
 * @param {Map} types
 * @param {function({NS}, {Number[]})} testfn
 * @param {Boolean} nosubmit
 */
export async function init(ons, types, testfn, nosubmit, noauto) {
  let ns = new nsRPC(ons)
  let fs = flags(ns)
  if (noauto && fs["toast"]) {
    ns.printf("Auto-run is disabled")
    return
  }
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
  if (fs["autotest"] != "") {
    return await autotest(ns, types, fs["autotest"], fs["limit"])
  }

  let host = fs._[0]
  let file = fs._[1]
  if (file == undefined) {
    let ccts = new Map()
    for (let cct of ns.ls(host, "contract-")) {
      ccts.set(cct, await ns.codingcontract.getContract(c, host))
    }
    let cs = ns.ls(host, "contract-").filter(
      (c) => Array.from(types.keys()).includes(ccts.get(c).type)
    )
    if (cs.length == 1) {
      file = cs[0]
    } else if (cs.length == 0) {
      ns.tprintf("No valid contracts found.")
      return
    } else {
      ns.tprintf("%d contracts found:", cs.length)
      cs.forEach((c) => ns.tprintf("  %s", c))
      return
    }
  }
  let c = await ns.codingcontract.getContract(file, host)
  if (!c) {
    err(ns, "Can't get contract %s@%s", file, host)
    return
  }

  if (!types.has(c.type)) {
    err(ns, "Wrong contract type: %s", c.type)
    return
  }

  // Check if we're already solving this.
  if (ns.ps("home").filter(
    (p) => p.filename == ns.getScriptName() &&
           p.args[0] == host &&
           p.args[1] == file &&
           p.pid != ns.pid
  ).length > 0) {
    ns.printf("Already solving %s@%s:", file, host)
    ns.ps("home").filter(
      (p) => p.filename == ns.getScriptName() &&
            p.args[0] == host &&
            p.args[1] == file &&
           p.pid != ns.pid
    ).forEach((p) => ns.print(p))
    return
  }

  ns.printf("type=%s", c.type)
  let fn = types.get(c.type)
  let data = c.data
  ns.printf("data=%j", data)
  await info(ns, "Attempting to solve contract %s...", c.type)
  let res = await fn(ns, data)
  let msg = nosubmit && host == "home" ? "Not submitted" : c.submit(res)
  msg ||= ns.sprintf("Contract failed, %d attempts remaining", c.numTriesRemaining)
  if (fs["toast"]) {
    ns.printf("Input data:\n%j", data)
    ns.printf("Result: %j", res)
    ns.print(msg)
    ns.toast(msg, msg.includes("failed") ? "warning" : "success")
    await info(ns, msg)
  } else {
    ns.tprintf("Input data:\n%j", data)
    ns.tprintf("Result: %j", res)
    ns.tprint(msg)
    await info(ns, msg)
  }
  await info(ns, "Attempted to solve contract %s: %s", c.type, msg)
  await record(ns, c.type, msg)
}

async function listContracts(ns, flags) {
  let hosts = Array.from(dns(ns).values()).
    filter((h) => h.files.filter((f) => f.endsWith(".cct")).length > 0)
  if (hosts.length > 0) {
    ns.tprintf("Hosts with contracts:")
    let data = []
    let ccts = hosts.map(
      (h) => h.files.filter(
        (f) => f.endsWith(".cct")
      ).filter(
        (f) => ns.fileExists(f, h.name)
      ).map((f) => [h.name, f])).flat(1)
    ns.printf("ccts=%j", ccts)
    for (let cct of ccts) {
      let c = await ns.codingcontract.getContract(cct[1], cct[0])
      data.push([cct[0], cct[1], c.type])
    }

    // ns.tprint(data)
    // data.forEach((l) => ns.tprint(l))
    ns.tprint(table(ns, ["Host", "Filename", "Type"], data))
  } else {
    ns.tprint("No hosts with contracts")
    return
  }

  if (flags["all"]) {
    let start  = Date.now()
    let run, skipped, blocked, error
    ns.tprintf("Attempting to solve all contracts...")
    for (let d of data) {
      let [host, file, type] = d
      if (!ns.fileExists(file, host)) {
        error = error ?? 0 + 1
        continue
      }
      ns.tprintf("Reading %s@%s", file, host)
      let c = await ns.codingcontract.getContract(file, host)
      if (!types.has(c.type)) {
        ns.tprintf("Unknown contract type %s", c.type)
        ns.printf("Unknown contract type %s", c.type)
        error = error ?? 0 + 1
        continue
      }
      ns.printf("%d attempts remaining", c.numTriesRemaining)
      if (c.numTriesRemaining < 10) {
        ns.tprintf("Skipping with %d attempts remaining...", c.numTriesRemaining)
        skipped = skipped ?? 0 + 1
        continue
      }
      let code = types.get(c.type)
      if (ns.getScriptRam(code) > ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) {
        ns.tprintf(
          "Can't start %s, needs %s but only have %s available",
          code, ns.formatRam(ns.getScriptRam(code)),
          ns.formatRam(ns.getServerMaxRam("home") - ns.getServerUsedRam("home")))
        skipped = skipped ?? 0 + 1
        continue
      }
      if (blocked(ns, type)) {
        ns.tprintf("Skipping blocked contract: %s", type)
        blocked = blocked ?? 0 + 1
        continue
      }
      let pid = ns.run(code, 1, host, file, "--toast")
      run = run ?? 0 + 1
      while (ns.isRunning(pid)) {
        await ns.asleep(5000)
      }
    }
    let msg = []
    if (run > 0) msg.push(ns.sprintf("%d run", run))
    if (skipped > 0) msg.push(ns.sprintf("%d skipped", skipped))
    if (blocked > 0) msg.push(ns.sprintf("%d blocked", blocked))
    if (error > 0) msg.push(ns.sprintf("%d error", error))
    ns.tprintf("Done: %s", msg.join(", "))
    if (ns.fileExists("/data/contractHistory.json")) {
      data = JSON.parse(ns.read("/data/contractHistory.json")).filter(
        (d) => d.ts > start
      )
      let bounty = data.map((d) => d.bounty).reduce((a,i) => a + i, 0)
      let fcs = new Map()
      data.forEach(
        (d) => d.factions.forEach(
          (f) => fcs.set(f, fcs.get(f) ?? 0 + d.rep)
        )
      )
      if (bounty > 0) {
        ns.tprintf("Total bounty: $%s", ns.formatNumber(bounty))
      }
      let fs = Array.from(fcs.keys()).sort()
      if (fs.length > 0) {
        ns.tprintf("Reputation gains:")
        ns.tprintf(
          table(ns,
            ["Faction", "Rep gain"],
            fs.map(
              (f) => [f, ns.formatNumber(fcs.get(f))]
            )))
      }
    }
  }

  return
}

async function autotest(ns, types, type, limit=100) {
  let allTypes = Array.from(types.keys())
  if (allTypes.length == 1) {
    type = allTypes[0]
  } else {
    type = allTypes.filter((t) => t.includes(type))
    if (type.length != 1) {
      ns.tprintf("Select type:")
      Array.from(types.keys()).forEach((t) => ns.tprintf("  %s", t))
      return
    }
    type = type[0]
  }
  let good = []
  let bad = []
  await info(ns, "Running %d autotest for %s", limit, type)
  for (let n=0; n<limit; n++) {
    let file = await ns.codingcontract.createDummyContract(type)
    ns.printf("Created contract: %s", file)
    let c = await ns.codingcontract.getContract(file, "home")
    ns.printf("data=%j", c.data)
    let res = await types.get(type)(ns, c.data)
    ns.printf("res=%j", res)
    if (c.submit(res)) {
      ns.printf("Test success!")
      good.push(c.data)
    } else {
      ns.printf("Test failed:\ndata=%j\nres=%j\nfile=%s", c.data, res, file)
      bad.push(c.data)
    }
    await ns.asleep(100)
  }
  if (bad.length == 0) {
    await info(ns, "%s %d%% success (+%d, -%d)",
      type, (good.length/limit)*100, good.length, bad.length)
  } else {
    await warning(ns, "%s %d%% success (+%d, -%d) -> logs/autotest.txt",
      type, (good.length/limit)*100, good.length, bad.length)
    let out = [...good.map((l) => ns.sprintf("g: %j", l)),
      ...bad.map((l) => ns.sprintf("b: %j", l))].join("\n")
    ns.write("logs/autotest.txt", out, "w")
  }
}
