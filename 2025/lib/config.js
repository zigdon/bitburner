import { warning, info, toast } from "@/log.js"

export async function loadCfg(ns, name, old) {
  let next = await readCfg(ns, name)
  if (next?.valid) {
    let d = await diff(ns, old, next)
    if (d.length > 0) {
      info(ns, "New config loaded from %s, %d differences", name, d.length)
      d.forEach((l) => info(ns, l))
    }
    return next
  } else {
    return old
  }
}

async function readCfg(ns, name) {
  if (!ns.fileExists(name)) {
    await warning(ns, "%s not found", name)
    return
  }
  var next = JSON.parse(ns.read(name))
  if (next?.valid) {
    return next
  }
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
