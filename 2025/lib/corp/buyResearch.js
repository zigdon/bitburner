/** @param {NS} ns */
export async function main(ns) {
  let div = ns.args[0]
  let topic = ns.args[1]
  let c = ns.corporation
  if (c.hasResearched(div, topic)) {
    ns.tprintf("%s has already researched %s", div, topic)
    return
  }
  let cost = c.getResearchCost(div, topic)
  if (c.getDivision(div).researchPoints < cost) {
    ns.tprintf("%s has can't afford %s", div, topic)
    return
  }

  ns.tprintf("%s researching %s", div, topic)
  c.research(div, topic)
}
