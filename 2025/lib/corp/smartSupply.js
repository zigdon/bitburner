import {singleInstance} from "@/lib.util.js"

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
  // - In every city, use imports, then buy the rest
  // - Every thing we make, export to all the divs in the city that need it,
  // then sell the rest.
  for (let d of divisions) {
    let div = c.getDivision(d)
    let id = c.getIndustryData(div.type)
    ns.printf("%s(%s):", d, div.type)
    for (let city of div.cities) {
      c.setSmartSupply(d, city, true)
      for (let m of Object.keys(id.requiredMaterials)) {
        c.setSmartSupplyOption(d, city, m, "imports")

        // Whatever we don't use, sell at a markup
        c.sellMaterial(d, city, m, "MAX-10", "MP")
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
            c.exportMaterial(d, city, dstDiv, city, m, amt)
          }
        }
        c.sellMaterial(d, city, m, "MAX", "MP")
      }
    }
  }
}
