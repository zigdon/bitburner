/** @param {NS} ns */
export async function main(ns) {
  let flags = ns.flags([
    ["n", 10],
  ])
  let fn = flags["_"][0]
  let data = ns.read(fn).split("\n")
  ns.tprint(data.slice(data.length-10).join("\n"))
}

export function autocomplete(data, args) {
  return [...data.txts];
}
