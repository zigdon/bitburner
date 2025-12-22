import {table} from "@/table.js"

export async function main(ns) {
  let c = ns.corporation
  let ds = c.getCorporation().divisions.map((d) => c.getDivision(d).type)
  let ind = c.getConstants().industryNames
  let headers = ["Name", "Cost", "Starter", "Reqs", "Produces", "Makes Mats", "Makes Products"]
  let data = []
  for (let i of ind) {
    let id = c.getIndustryData(i)
    data.push([
      [i, ds.includes(i) ? "white" : "green"],
      "$"+ns.formatNumber(id.startingCost),
      id.recommendStarting,
      [ns.sprintf("%j", id.requiredMaterials)],
      [id.producedMaterials],
      id.makesMaterials,
      id.makesProducts
    ])
  }

  ns.tprintf(table(ns, headers, data))
}
