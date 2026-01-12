import {dns} from "@/hosts.js"
import {singleInstance} from "@/lib/util.js"
import {info, warning} from "@/log.js"
import {nsRPC} from "@/lib/nsRPC.js"

/*
 * Get all the rpc servers we have, find a server that can run them, if they
 * aren't already.
 */
/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) return
  createScripts(ns)
  let rpcs = ns.ls("home", "lib/rpc").filter((f) => f.includes(".js"))
  let namespaces = ns.ls("home", "lib/rpc").filter((f) => !f.includes(".js"))
  for (let n of namespaces) {
    rpcs.push(...ns.ls("home", "lib/rpc/"+n).filter((f) => f.includes(".js")))
  }
  for (let r of rpcs) {
    await ns.asleep(1)
    if (checkRunning(ns, r)) continue
    await start(ns, r)
  }

  // Check all the running servers, if we have two versions running (one on
  // home and one elsewhere), kill the version on home.
  for (let r of rpcs) {
    await ns.asleep(1)
    if (!ns.scriptRunning(r, "home")) continue
    if (!checkRunning(ns, r)) continue
    if (ns.kill(r, "home")) {
      await info(ns, "Moved %s off home", r)
    } else {
      await info(ns, "Failed to kill home's version of %s", r)
    }
  }
}

const tmpl = `
import { nsRPC } from "/lib/nsRPC.js"

/** @param {NS} ons */
export async function main(ons) {
  /** @type {NS} ns */
  let ns = new nsRPC(ons)

  await ns.listen("%s", ons.%s.%s)
}
`

function createScripts(ns) {
  let net = new nsRPC(ns)
  for (let f of net._ports.keys()) {
    let namespace = ""
    let func = f
    if (f.includes("_")) {
      [namespace, func] = f.split("_")
    }
    let fn = ns.sprintf("/lib/rpc/%s/%s.js", namespace, func)
    if (ns.fileExists(fn)) continue
    ns.printf("Creating rpc server for %s.%s", namespace || "ns", func)
    let key = namespace == "" ? func : namespace+"_"+func
    ns.write(fn, ns.sprintf(tmpl, key, namespace, func), "w")
  }
}

async function checkCorp(ns) {
  if (!checkRunning(ns, "lib/rpc/corporation/hasCorporation.js", false)) return false
  let net = new nsRPC(ns)
  return await net.corporation.hasCorporation()
}

/**
 * @param {NS} ns
 * @param {string} name
 **/
async function start(ns, name) {
  // Only start corp RPC servers once we have a corp
  if (name.includes("/corporation/") && !name.includes("hasCorporation")) {
    if (!await checkCorp(ns)) {
      ns.printf("Skipping starting corp script %s without a corp", name)
      return
    }
  }

  let mem = ns.getScriptRam(name)
  let fleet = dns(ns)
  let hosts = Array.from(fleet.values()).filter(
    (h) => h.root
  ).sort(
    (a,b) => b.used - a.used
  )
  hosts = hosts.filter((h) => h.name != "home")
  hosts.push(fleet.get("home"))

  for (let h of hosts) {
    ns.printf("Checking %s: %s/%s (need %s",
      h.name, ns.formatRam(h.used), ns.formatRam(h.ram), ns.formatRam(mem))
    if (h.ram-h.used - (h.name == "home" ? 100 : 0) < mem) {
      continue
    }

    // If it's already running on home, move on.
    if (h.name == "home" && checkRunning(ns, name, false)) continue

    ns.scp([name, "log.js", "/lib/nsRPC.js"], h.name)
    let pid = ns.exec(name, h.name, 1)
    if (pid > 0) {
      await info(ns, "Starting %s on %s (%s/%s): %d",
        name, h.name, ns.formatRam(mem), ns.formatRam(h.ram), pid)
      return
    }
  }

  // Only warn if we don't end up with a running version anywhere.
  if (!checkRunning(ns, name, false))
    await warning(ns, "Couldn't start %s", name)
}

/**
 * @param {NS} ns
 * @param {string} name
 * @param {boolean} skipHome
 **/
function checkRunning(ns, name, skipHome=true) {
  let hosts = dns(ns)
  for (let h of hosts.keys()) {
    // Ignore versions that are running on home, we can try to relocate them.
    if (skipHome && h == "home") continue
    if (ns.scriptRunning(name, h)) {
      ns.printf("Found %s running on %s", name, h)
      return true
    }
  }

  ns.printf("%s not running", name)
  return false
}
