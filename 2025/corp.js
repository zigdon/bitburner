import {table} from "@/table.js"

/** @param {NS} ns */
export async function main(ns) {
  const cmds = new Map([
    ["divs", divisions],
  ])

  let cmd = ns.args[0]
  if (cmds.has(cmd)) {
    cmds.get(cmd)(ns)
  } else {
    ns.tprintf("Known commands: %s", Array.from(cmds.keys()).join(", "))
  }
}

/** @param {NS} ns */
function divisions(ns) {
  const c = ns.corporation
  const divs = c.getCorporation().divisions
  let data = []
  const headers = [
    "Name", "Type", "Mult", "RP", "Revenue", "Expenses", "Profit", "Needs", "Makes",
  ]
  for (let name of divs) {
    let d = c.getDivision(name)
    let di = c.getIndustryData(d.type)
    let profits = d.lastCycleRevenue - d.lastCycleExpenses
    data.push([
      d.name, d.type,
      ns.sprintf("%.2f", d.productionMult),
      ns.formatNumber(d.researchPoints),
      "$"+ns.formatNumber(d.lastCycleRevenue),
      "$"+ns.formatNumber(d.lastCycleExpenses),
      profits > 0 ? "$"+ns.formatNumber(profits) : "($"+ns.formatNumber(-profits)+")",
      Array.from(Object.keys(di.requiredMaterials)).sort().join(", ") || "N/A",
      di.makesMaterials ? di.producedMaterials.sort().join(", ") : "N/A"
    ])
  }

  ns.tprintf(table(ns, headers, data))
}
