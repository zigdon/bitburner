/** @param {NS} ns */
export async function main(ns) {
  let flags = ns.flags([
    ["clear", false],
  ])
  let port = flags._[0]
  const marker = "===dumpport==="
  let ph = ns.getPortHandle(port)
  let pop = ph.write(marker)
  let i = 0
  if (pop != undefined) {
    ns.tprintf("Queue was full")
    ns.tprintf("%d: %j", i++, pop)
  }
  while (pop != marker) {
    await ns.asleep(1)
    pop = ph.read()
    if (pop == marker) break
    ns.tprintf("%d: %j", i++, pop)
    ph.write(pop)
  }

  if (flags.clear && ns.prompt("Clear port?")) {
    ph.clear()
  }
}
