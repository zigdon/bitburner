import { nsRPC } from "@/lib/nsRPC.js"

/** @param {NS} ons */
export async function main(ons) {
  /** @type {NS} ns */
  let ns = new nsRPC(ons)

  const getProduct = (divName, cityName, pName) => {
    if (ons.corporation.getDivision(divName).products.includes(pName)) {
      return ons.corporation.getProduct(divName, cityName, pName)
    }
    return undefined
  }

  await ns.listen("corporation_getProduct", getProduct)
}

