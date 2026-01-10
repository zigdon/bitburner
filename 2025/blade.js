/** @param {NS} ns */
export async function main(ns) {
  /** @type Map<string, func(ns, args)>*/
  let cmds = new Map([
    ["status", bbStatus],
  ])

  if (cmds.has(ns.args[0])) {
    cmds.get(ns.args[0])(ns, ns.args.slice(1))
  } else {
    ns.tprintf(
      "Unknown command %j. Pick one of %j",
      ns.args[0], Array.from(cmds.keys()).join(", "))
  }
}

functino bbStatus(ns) {
  let b = ns.bladeburner
}
