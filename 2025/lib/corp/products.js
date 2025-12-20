import { info } from "@/log.js"

export async function main(ns) {
  let [name, pName] = ns.args

  await researchProduct(ns, name, "Sector-12", pName)
}

async function researchProduct(ns, name, city, pName) {
  let c = ns.corporation
  let ps = c.getDivision(name).products
  for (let p of ps) {
    if (c.getProduct(name, city, p).developmentProgress < 100) {
      await info(ns, "%s@%s is still under development: %d%%",
        p, name, c.getProduct(name, city, p).developmentProgress )
      return
    }
    c.sellProduct(name, city, p, "MAX", "MP", true)
  }
  let gen = Math.max(...ps.map((n) => Number(n.slice(n.indexOf(" ")+1)))) ?? 0
  pName = ns.sprintf("%s %d", pName, gen+1)
  // Check if we can develop more products, otherwise retire the first
  if (ps.length >= c.getDivision(name).maxProducts) {
    await info(ns, "Retiring %s to start development of %s", ps[0], pName)
    c.discontinueProduct(name, ps[0])
  }
  await info(ns, "Starting development of %s at %s...", pName, name)
  let design = 1000000000 * (gen+1)
  let adv = 1000000000 * (gen+1)
  c.makeProduct(name, city, pName, design, adv)
}

