import {singleInstance} from "@/lib/util.js"

/** @param {NS} ns */
export async function main(ns) {
  if (!singleInstance(ns)) { return }
  ns.clearLog()
  let c = ns.corporation

  let divisions = c.getCorporation().divisions

  /*
  c.setSmartSupply(name, city, true)
  for (let mat of mats) {
    c.setSmartSupplyOption(name, city, mat, "leftovers")
  }
  */

  // Collect all we need and make
  let needs = new Map()
  for (let d of divisions) {
    let div = c.getDivision(d)
    let id = c.getIndustryData(div.type)
    for (let m of Object.keys(id.requiredMaterials)) {
      if (!needs.has(m)) {
        needs.set(m, [])
      }
      let n = needs.get(m)
      n.push(d)
      needs.set(m, n)
    }
  }
  ns.print("needs:")
  ns.print(needs)

  // - Set smart supply in every div
  // - In every city, use leftovers, then buy the rest
  // - Every thing we make, export to all the divs in the city that need it,
  // then sell the rest.
  for (let d of divisions) {
    let div = c.getDivision(d)
    let id = c.getIndustryData(div.type)
    ns.printf("%s(%s):", d, div.type)

    // If we make products, make sure we're selling them
    if (id.makesProducts) {
      for (let pName of div.products) {
        let p = c.getProduct(d, "Sector-12", pName)
        if (p.developmentProgress < 100) {
          continue
        }
        c.sellProduct(d, "Sector-12", pName, "MAX", "MP", true)
        if (c.hasResearched(d, "Market-TA.I")) {
          c.setProductMarketTA1(d, pName, true)
        }
        if (c.hasResearched(d, "Market-TA.II")) {
          c.setProductMarketTA2(d, pName, true)
        }
      }
    }

    for (let city of div.cities) {
      c.setSmartSupply(d, city, true)
      for (let m of Object.keys(id.requiredMaterials)) {
        // If it's a production booster, use imports to keep the static amount
        // otherwise, use leftovers.
        if (["Hardware", "Robots", "AI Cores", "Real Estate"].includes(m)) {
          c.setSmartSupplyOption(d, city, m, "imports")
        } else {
          c.setSmartSupplyOption(d, city, m, "leftovers")
        }
      }

      if (!id.makesMaterials) { continue }
      for (let m of id.producedMaterials) {
        if (needs.has(m)) {
          if (city == div.cities[0]) {
            ns.printf("  %s -> %j", m, needs.get(m))
          }
          // ns.printf("Exporting %s from %s@%s to %s", m, d, city, needs.get(m).join(", "))
          // Clear whatever exports are already defined
          for (let e of c.getMaterial(d, city, m).exports) {
            c.cancelExportMaterial(d, city, e.division, e.city, m)
          }
          let amt = ns.sprintf("EINV/%d", needs.get(m).length)
          // Set up an export to all who need in the city
          for (let dstDiv of needs.get(m)) {
            if (c.hasWarehouse(dstDiv, city)) {
              c.exportMaterial(d, city, dstDiv, city, m, amt)
            }
          }
        }
        if (["Hardware", "Robots", "AI Cores", "Real Estate"].includes(m)) {
          // For warehouse factors, only sell what we produced
          c.sellMaterial(d, city, m, "PROD", "MP")
        } else {
          c.sellMaterial(d, city, m, "MAX", "MP")
        }
        if (c.hasResearched(d, "Market-TA.I")) {
          c.setMaterialMarketTA1(d, city, m, true)
        }
        if (c.hasResearched(d, "Market-TA.II")) {
          c.setMaterialMarketTA2(d, city, m, true)
        }
      }
    }
  }
}
