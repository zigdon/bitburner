import { table } from "@/table.js"
import { critical } from "@/log.js"

var playerHack = 0
var tools = 0
var lit = []

var story = [
  "CSEC", "I.I.I.I", "avmnite-02h", "run4theh111z", "w0r1d_d43m0n",
]

/** @param {NS} ns */
export async function main(ns) {
  [
    "scan", "getServerMaxRam",
    "getServer",
    "getServerRequiredHackingLevel",
    "getServerNumPortsRequired",
    "getServerUsedRam",
    "getServerMaxMoney",
    "getServerMoneyAvailable",
    "brutessh", "nuke",
    "ftpcrack", "relaysmtp",
    "httpworm", "sqlinject"
  ].forEach((i) => ns.disableLog(i))
  ns.clearLog()
  lit = ns.ls("home", "*.lit")
  var flags = ns.flags([
    ['noroot', false],
    ['backdoor', false],
    ['sort', 'h'],
    ['pserv', false],
    ['silent', false],
  ])

  playerHack = ns.getPlayer().skills.hacking
  tools = 0
  for (var t of ["BruteSSH.exe", "FTPCrack.exe", "RelaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]) {
    if (ns.fileExists(t)) {
      tools += 1
    }
  }
  ns.printf("Have %d tools available", tools)
  var hacked = []
  var seen = new Map()
  seen.clear()
  ns.printf("Starting scan...")
  hacked.push(...scan(ns, seen, "home"))

  var hosts = Array.from(seen.values())
  if (flags["_"] != undefined) {
    hosts = hosts.filter((h) => h.name.includes(flags["_"]))
  }

  if (flags.sort == "h") {
    hosts.sort((a, b) => a.hack - b.hack)
  } else if (flags.sort == "m") {
    hosts.sort((a, b) => a.max - b.max)
  } else if (flags.sort == "r") {
    hosts.sort((a, b) => a.ram - b.ram)
  }
  var headers = ["Name", "Root", "RAM", "Security", "Money", "Hack", "Backdoor", "From", "Files"]
  var data = []
  var notice = []
  var bd = 0
  for (var h of hosts) {
    if (!flags.noroot && !h.root) {
      continue
    }
    if (!flags.pserv && h.purchased && h.name != "home") {
      continue
    }
    if (flags.backdoor && (h.backdoor || h.hack > playerHack)) {
      continue
    }
    if (story.includes(h.name) && !h.backdoor && h.hack > playerHack) {
      notice.push(h.name)
    }
    if (!h.backdoor && h.root && h.hack <= playerHack && !h.purchased ) {
      if (h.name == "w0r1d_d43m0n") {
        if (!ns.fileExists("data/wd.txt")) {
          var msg = "w0r1d_d43m0n is hackable"
          ns.toast(msg, "warning", null)
          await critical(ns, msg)
          ns.write("data/wd.txt", "", "w")
        }
      } else {
        bd++
      }
    }
    data.push([
      [h.name, story.includes(h.name) ? "white" : ""],
      h.root, ns.formatRam(h.used, 0) + "/" + ns.formatRam(h.ram, 0),
      ns.sprintf("%.2f%% of %s", 100 * h.sec / h.min, h.min),
      "$" + ns.formatNumber(h.cur, 0) + "/$" + ns.formatNumber(h.max, 0),
      (h.hack > playerHack ? [h.hack, "red"] : h.hack),
      ([h.backdoor, !h.purchased && h.hack <= playerHack && !h.backdoor ? "red" : ""]),
      h.name == "home" ? "N/A" : [h.from, h.from == "home" || seen.get(h.from).backdoor ? "" : "yellow"],
      h.name != "home" ? h.files.join(",") : "",
    ])
  }
  if (bd > 0) {
    ns.toast(ns.sprintf("Backdooring %d hosts", bd), "info")
    ns.run("g/backdoor.js", 1)
  }
  if (notice.size > 0) {
    ns.notice(ns.sprintf("Story hosts available: %s", notice.join(", ")))
  }
  if (!flags.silent) {
    ns.tprint("\n" + table(ns, headers, data))
    if (hacked.length > 0) {
      ns.tprintf("Hacked: %s", hacked.join())
    }
    var hostsWithContracts = hosts.filter(
      (h) => h.files.filter(
        (f) => f.endsWith(".cct")).length > 0)
    var contracts = []
      hostsWithContracts.forEach(
      (h) => h.files.filter(
        (f) => f.endsWith(".cct")
      ).map(
        (c) => [h.name, c]
      ).forEach(
        (c) => contracts.push(c)
      )
    )
    var cs = Map.groupBy(contracts, (c) => ns.codingcontract.getContractType(c[1], c[0]))
    if (cs.size) {
      ns.tprintf("Contracts:")
      ns.tprintf(
        table(ns,
          ["Type", "Host"],
          Array.from(cs.keys()).toSorted().map((k) => [k, cs.get(k).map((c) => c[0]).join(", ")])))
    }
    if (notice.size > 0) {
      ns.tprintf("Story hosts available: %s", notice.join(", "))
    }
  }
  ns.printf("hacked: %v", hacked)

  ns.write("/data/hosts.json", JSON.stringify(Array.from(seen.values())), "w")
  installHosts(ns, Array.from(seen.keys()))

}

/**
  @param {NS} ns
  @param {String[]} hosts
*/
function installHosts(ns, hosts) {
  for (var h of hosts) {
    if (ns.fileExists("hosts.txt", h)) {
      continue
    }
    var f = ns.sprintf("/tmp/hosts.%s.txt", h)
    ns.write(f, h, "w")
    ns.scp(f, h)
    ns.mv(h, f, "hosts.txt")
    ns.printf("Installed hosts.txt on %s", h)
    ns.rm(f)
  }
}

/**
  @param {NS} ns
  @param {Map} s
  @param {String} host
  @param {Number} depth
  @returns {List}
*/
function scan(ns, s, host) {
  if (s.has(host)) {
    return []
  }
  var added = []
  var files = ns.ls(host).filter((f) => !f.endsWith(".js") && f != "hosts.txt")
  if (host != "home") {
    files.filter((f) => {
      if (f.endsWith(".lit")) {
        if (lit.includes(f)) {
          return !ns.rm(f, host)
        } else {
          return !(ns.scp(f, "home", host) && ns.rm(f, host))
        }
      }
      return true
    })
  }
  var dests = ns.scan(host)
  var server = ns.getServer(host)
  var ent = {
    name: host,
    root: server.hasAdminRights,
    ram: server.maxRam,
    used: server.ramUsed,
    cur: server.moneyAvailable,
    max: server.moneyMax,
    sec: server.hackDifficulty,
    min: server.minDifficulty,
    hack: server.requiredHackingSkill,
    ports: server.numOpenPortsRequired,
    backdoor: server.backdoorInstalled,
    purchased: server.purchasedByPlayer,
    files: files,
    from: dests[0]
  }
  s.set(host, ent)
  if (ent.ports <= tools && !ent.root) {
    ns.printf("Hacking %s (%d <= %d)", host, ent.ports, tools)
    added.push(host)
    ns.fileExists("BruteSSH.exe") && ns.brutessh(host)
    ns.fileExists("FTPCrack.exe") && ns.ftpcrack(host)
    ns.fileExists("RelaySMTP.exe") && ns.relaysmtp(host)
    ns.fileExists("HTTPWorm.exe") && ns.httpworm(host)
    ns.fileExists("SQLInject.exe") && ns.sqlinject(host)
    ns.nuke(host)
    ent.root = true
  }
  dests.forEach((h) => {
    added.push(...scan(ns, s, h))
  })

  return added
}
