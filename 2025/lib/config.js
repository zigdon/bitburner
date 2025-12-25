import { warning, info, toast } from "@/log.js"

export async function loadCfg(ns, name, old) {
  let next = await readCfg(ns, name)
  if (next?.valid) {
    let d = await diff(ns, old, next)
    if (d.length > 0) {
      await info(ns, "New config loaded from %s, %d differences", name, d.length)
      for (let l of d) {
        await info(ns, l)
      }
    }
    return next
  } else {
    return old
  }
}

async function readCfg(ns, name) {
  ns.printf("Reading config from %s for %s", name, ns.getScriptName())
  if (!ns.fileExists(name)) {
    await warning(ns, "%s not found", name)
    return
  }
  let next = JSON.parse(ns.read(name))
  ns.printf("Parsing config from %s for %s", name, ns.getScriptName())
  if (next?.valid) {
    ns.printf("... %s valid", name)
    return next
  }
  ns.printf("... %s invalid", name)
  await warning(ns, "Error parsing %s", name)
}

async function diff(ns, prev, next, path) {
  await ns.asleep(1)
  if (prev == next || prev == undefined || next == undefined) { return [] }
  let missing = []
  let extra = []
  let differences = []
  path ??= ""
  for (let k of Object.getOwnPropertyNames(prev)) {
    if (!Object.hasOwn(next, k)) {
      missing.push(ns.sprintf("%s:%s %j", path, k, prev[k]))
      continue
    }
    differences.push(...await diff(ns, prev[k], next[k], path+"/"+k))
  }
  for (let k of Object.getOwnPropertyNames(next)) {
    if (!Object.hasOwn(prev, k)) {
      extra.push(ns.sprintf("%s:%s %j", path, k, next[k]))
    }
  }

  return [...extra.map((e) => "+"+e), ...missing.map((e) => "-"+e), ...differences]
}
