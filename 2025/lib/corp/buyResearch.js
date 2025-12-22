/** @param {NS} ns */
export async function main(ns) {
  let div = ns.args[0]
  let topic = ns.args[1]
  let c = ns.corporation
  if (c.hasResearched(div, topic)) {
    ns.printf("%s has already researched %s", div, topic)
    return
  }
  let cost = c.getResearchCost(div, topic)
  if (c.getDivision(div).researchPoints < cost) {
    ns.printf("%s has can't afford %s", div, topic)
    return
  }

  ns.printf("%s researching %s", div, topic)
  c.research(div, topic)
}
