/** @param {NS} ns */
export async function main(ns) {
  var type = ns.args[0]
  var types = ns.codingcontract.getContractTypes().sort()
  if (type == undefined) {
    type = await ns.prompt("Contract type", {type: "select", choices: types})
  }
  if (!types.includes(type)) {
    type = types.filter((t) => t.toLowerCase().includes(type))
    if (type.length == 0) {
      ns.tprint("Possible types:")
      types.forEach((t) => ns.tprintf("  %s", t))
      return
    }
    if (type.length > 1) {
      ns.tprint("Matching types:")
      type.forEach((t) => ns.tprintf("  %s", t))
      return
    }
    type = type[0]
  }
  if (type == "") {
    return
  }
  ns.tprintf("Creating dummy contract for %s", type)
  ns.tprint(ns.codingcontract.createDummyContract(type))
}
