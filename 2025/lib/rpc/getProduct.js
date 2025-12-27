import { dn } from "@/lib/dn.js"

/** @param {NS} ons */
export async function main(ons) {
  /** @type {NS} ns */
  let ns = new dn(ons)

  const getProduct = (divName, cityName, pName) => {
    if (ons.corporation.getDivision(divName).products.includes(pName)) {
      return ons.corporation.getProduct(divName, cityName, pName)
    }
    return undefined
  }

  await ns.listen("corporation_getProduct", ons.corporation.getProduct)
}

