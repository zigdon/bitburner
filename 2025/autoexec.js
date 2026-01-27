import { dns } from "@/hosts.js"
import { critical, info, toast } from "@/log.js"
import { loadCfg } from "@/lib/config.js"

const config = "data/autoexec.json"
var cfg = {valid:false}
/** @param {NS} ns */
export async function main(ns) {
  [
    "getServerMaxRam",
    "asleep",
  ].forEach((i) => ns.disableLog(i))
  ns.clearLog()
  ns.rm("data/wd.txt", "home")
  ns.ls("home", "/bak").forEach((f) => ns.rm(f, "home"))
  ns.ls("home", "/logs").filter(
    (f) => f.endsWith(".txt")
  ).forEach(
    (f) => ns.mv("home", f, "/bak/"+f)
  )
  cfg = await loadCfg(ns, config, null)
  if (!cfg?.valid) {
    await critical(ns, "Failed to load config at startup")
    return
  }
  let start = Date.now()
  let first = true

  while(true) {
    // Update config
    var next = await loadCfg(ns, config, cfg)
    if (next.valid) {
      if (JSON.stringify(next) != JSON.stringify(cfg)) {
        ns.printf("New config: %j", next)
      }
      cfg = next
    }

    // Restart what we expect should be running.
    for (var p of cfg.run) {
      if (p.disabled) continue
      if (p.oneTime && !first) continue
      if (p.wait && Date.now() - start < p.wait*1000) continue
      let s = ns.getServer()
      if (p.ram && s.maxRam < p.ram) continue
      if (p.pservs > 0 && p.pservs <= ns.getPurchasedServers().length) continue
      await check(ns, p)
      await ns.asleep(100)
    }

    // Find contracts.
    if (cfg.loop.contracts) await findContracts(ns)
    await ns.asleep(100)

    // Record a ledger
    let rec = {ts: Date.now(), player: ns.getPlayer()}
    ns.write("logs/player.json", JSON.stringify(rec)+"\n", "a")

    ns.printf("Loop done: %s", Date())
    first = false
    await ns.asleep(60000)
  }

}

/**
 * @param {NS} ns
 */
async function findContracts(ns) {
  var hosts = dns(ns)
  var count = 0
  for (var h of hosts.keys()) {
    if (h == "home") {
      continue
    }
    var cs = ns.ls(h).filter((f) => f.endsWith(".cct"))
    for (var c of cs) {
      await info(ns, "Found contract %s on %s", c, h)
      ns.run("contracts.js", 1, h, c, "--toast")
      count++
    }
  }
  if (count > 0) {
    await toast(ns, "%d contracts found", count)
  }
}

/**
 * @param {NS} ns
 * @param {String} fn
 * @param {String} name
 */
async function check(ns, def) {
  ns.print(def)
  if (def.disabled) {
    ns.printf("%s disabled in loop config", def.name)
    return
  }
  if (ns.ps("home").filter((p) => p.filename == def.name).length == 0) {
    if (def.title) {
      await toast(ns, "Starting %s", def.title)
    }
    ns.run(def.name, 1, ...(def.args ?? []))
  }
}
