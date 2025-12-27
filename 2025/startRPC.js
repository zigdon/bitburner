import {dns} from "@/hosts.js"
import {singleInstance} from "@/lib/util.js"
import {info} from "@/log.js"
import {nsRPC} from "@/lib/nsRPC.js"

/*
 * Get all the rpc servers we have, find a server that can run them, if they
 * aren't already.
 */
/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) return
  createScripts(ns)
  let rpcs = ns.ls("home", "lib/rpc")
  for (let r of rpcs) {
    if (checkRunning(ns, r)) continue
    await start(ns, r)
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
    let fn = ns.sprintf("/lib/rpc/%s.js", func)
    if (ns.fileExists(fn)) {
      continue
    }
    ns.printf("Creating rpc server for %s.%s", namespace || "ns", func)
    let key = namespace == "" ? func : namespace+"_"+func
    ns.write(fn, ns.sprintf(tmpl, key, namespace, func), "w")
  }
}

/**
 * @param {NS} ns
 * @param {string} name
 **/
async function start(ns, name) {
  let mem = ns.getScriptRam(name)
  let hosts = Array.from(dns(ns).values()).sort(
    (a,b) => b.used - a.used
  )
  for (let h of hosts) {
    if (h.ram-h.used < mem) {
      continue
    }

    ns.scp([name, "/lib/nsRPC.js"], h.name)
    let pid = ns.exec(name, h.name, 1)
    if (pid > 0) {
      await info(ns, "Starting %s on %s (%s/%s): %d",
        name, h.name, ns.formatRam(mem), ns.formatRam(h.ram), pid)
      return
    }
  }
}

/**
 * @param {NS} ns
 * @param {string} name
 **/
function checkRunning(ns, name) {
  let hosts = dns(ns)
  for (let h of hosts.keys()) {
    if (ns.scriptRunning(name, h)) {
      ns.printf("Found %s running on %s", name, h)
      return true
    }
  }

  ns.printf("%s not running", name)
  return false
}
