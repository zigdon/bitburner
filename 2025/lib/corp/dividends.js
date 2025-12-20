/** @param {NS} ns */
export async function main(ns) {
  let rate = Number(ns.args[0])/100
  ns.printf("Setting dividends to %d%%", rate)
  ns.corporation.issueDividends(rate)
}
