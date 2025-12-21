import {info} from "@/log.js"
const cities = [
  "Sector-12",
  "Aevum",
  "Volhaven",
  "Chongqing",
  "New Tokyo",
  "Ishima",
]

/** @param {NS} ns */
export async function main(ns) {
  let [src, dst, mat, amt] = ns.args
  let c = ns.corporation

  await info(ns, "Exporting %s (%s) from %s->%s", mat, amt, src, dst)
  for (let city of cities) {
    let cur = c.getMaterial(src, city, mat)
    if (!cur.exports.some((e) => e.city == city && e.division == dst)) {
      c.exportMaterial(src, city, dst, city, mat, amt)
    }
    c.sellMaterial(src, city, mat, "MAX", "MP")
    c.setSmartSupplyOption(dst, city, mat, "imports")
  }
}
