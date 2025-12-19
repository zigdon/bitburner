import { info } from "@/log.js"

export async function main(ns) {
  let [name, pName, design, adv] = ns.args

  researchProduct(ns, name, "Sector-12", pName, design, adv)
}

function researchProduct(ns, name, city, pName, design, adv) {
  let c = ns.corporation
  let ps = c.getDivision(name).products
  for (let p of ps) {
    if (c.getProduct(name, city, p).developmentProgress < 100) {
      info(ns, "%s@%s is still under development: %d%%",
        p, name, c.getProduct(name, city, p).developmentProgress )
      return
    }
    c.sellProduct(name, city, p, "MAX", "MP", true)
  }
  pName = ns.sprintf("%s %d", pName, ps.length+1)
  info(ns, "Starting development of %s at %s...", pName, name)
  design *= 1000000000 * (ps.length+1)
  adv *= 1000000000 * (ps.length+1)
  c.makeProduct(name, city, pName, design, adv)
}

