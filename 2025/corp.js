/*
 * Getting Started with Corporation
 *
 * To get started, visit the city hall in Sector-12 in order to create a
 * corporation. This requires $150b of your own money, but this $150b will get
 * put into your corporation's funds. If you're in BitNode 3, you also have the
 * option to get seed money from the government in exchange for 500m shares.
 * Your corporation can have many different divisions, each in a different
 * industry. There are many different types of industries, each with different
 * properties. To create your first division, click the "Expand" button at the
 * top of the management UI. The agriculture industry is recommended for your
 * first division.
 *
 * The first thing you'll need to do is hire some employees. Employees can be
 * assigned to five different positions. Each position has a different effect
 * on various aspects of your corporation. It is recommended to have at least
 * one employee at each position.
 *
 * Each industry uses some combination of materials in order to produce other
 * materials and/or create products. Specific information about this is
 * displayed in each of your divisions' UI.
 *
 * Products are special, industry-specific objects. They are different than
 * materials because you must manually choose to develop them, and you can
 * choose to develop any number of products. Developing a product takes time,
 * but a product typically generates significantly more revenue than any
 * material. Not all industries allow you to create products. To create a
 * product, look for a button in the top-left panel of the division UI (e.g.,
 * for the software industry, the button says "Develop Software").
 *
 * To get your supply chain system started, purchase the materials that your
 * industry needs to produce other materials/products. This can be done by
 * clicking the "Buy" button next to the corresponding material(s). After you
 * have the required materials, you will immediately start production. The
 * amount and quality/effective rating of materials/products you produce is
 * based on a variety of factors, such as your employees and their productivity
 * and the quality of materials used for production.
 *
 * Once you start producing materials/products, you can sell them in order to
 * start earning revenue. This can be done by clicking the "Sell" button next
 * to the corresponding material or product. The amount of material/product you
 * sell is dependent on a wide variety of different factors. In order to
 * produce and sell a product, you'll have to fully develop it first.
 *
 * These are the basics of getting your corporation up and running! Now, you
 * can start purchasing upgrades to improve your bottom line. If you need
 * money, consider looking for seed investors, who will give you money in
 * exchange for stock shares. Otherwise, once you feel you are ready, take your
 * corporation public! Once your corporation goes public, you can no longer
 * find investors. Instead, your corporation will be publicly traded, and its
 * stock price will change based on how well it's performing financially. In
 * order to make money for yourself, you can set dividends for a solid,
 * reliable income, or you can sell your stock shares in order to make quick
 * money.
 *
 * Tips/Pointers
 *
 * -Start with one division, such as Agriculture. Get it profitable on its own,
 *  then expand to a division that consumes/produces a material that the
 *  division you selected produces/consumes.
 *
 * -Materials are profitable, but products are where the real money is,
 *  although if the product has a low development budget or is produced with
 *  low-quality materials, it won't sell well.
 *
 * -The "Smart Supply" upgrade is extremely useful. Consider purchasing it as
 *  soon as possible.
 *
 * -Purchasing Hardware, Robots, AI Cores, and Real Estate can potentially
 *  increase your production. The effects of these depend on what industry you
 *  are in.
 *
 * -In order to optimize your production, you will need a good balance of all
 *  employee positions.
 *
 * -Quality of materials used for production affects the quality/effective
 *  rating of materials/products produced, so vertical integration is important
 *  for high profits.
 *
 * -Materials purchased from the open market are always of quality 1.
 *
 * -The price at which you can sell your materials/products is highly affected
 *  by the quality/effective rating.
 *
 * -When developing a product, different employee positions affect the
 *  development process differently. Some improve the development speed, some
 *  improve the rating of the finished product.
 *
 * -If your employees have low morale or energy, their production will greatly
 *  suffer. Having enough interns will make sure those stats get high and stay
 *  high. 1/9 is a good ratio for interns (number of interns / office size). If
 *  morale and energy still drop, use 1/6.
 *
 * -Don't forget to advertise your company. You won't have any business if
 *  nobody knows you.
 *
 * -Having company awareness is great, but what's really important is your
 *  company's popularity. Try to keep your popularity as high as possible to
 *  see the biggest benefit for your sales.
 *
 * -Remember, you need to spend money to make money!
 *
 * -Your corporation does not reset when installing Augmentations, but it does
 *  reset when destroying a BitNode.
 */

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
  // Implementing the old guide from 
  // https://www.reddit.com/r/Bitburner/comments/ss609n/corporation_quick_guide_v140/
  createCorp(ns, "NotAVamp") || return
  createDiv(ns, "Agriculture", "AgriVamp") || return
  unlock(ns, "SmartSupply") || return
  for (let c of cities) {
    if (!ns.corporation.getDivision(dn).cities.includes(c)) {
      expandCity(ns, dn, c)
    }
    setSmartSupply(ns, "AgriVamp", c, "Food", "Plants")
    assign(ns, {ops: 1, eng: 1, mgt: 1})
    upgradeWarehouse(ns, dn, c, 1)
    sell(ns, "Food", "MAX", "MP")
    sell(ns, "Plants", "MAX", "MP")
    buyWarehouseFactors(ns, "Agriculture", c)
  }
}

function createCorp(ns, name) {
  let c = ns.corporation
  if (c.canCreateCorporation(true)) {
    ns.tprintf("Creating a self-funded corp: %s", name)
    c.createCorporation(name, true) && return true
  } else if (c.canCreateCorporation(false)) {
    ns.tprintf("Creating a grant-funded corp: %s", name)
    c.createCorporation(name, false) && return true
  }
  ns.tprintf("Can't create corp")
  return false
}

function createDiv(ns, ind, name) {
  let c = ns.corporation
  if (c.getDivision(name) == undefined) {
    ns.tprintf("Creating a new %s division: %s", ind, name)
    ns.corporation.expandIndustry(ind, name)
  }
  return c.getDivision(name) != undefined
}

function unlock(ns, upgrade) {
  let c = ns.corporation
  if (c.hasUnlock(upgrade)) {
    return true
  }
  ns.tprintf("Unlocking %s", upgrade)
  c.purchaseUnlock(upgrade)
  return c.hasUnlock(upgrade)
}

function setSmartSupply(ns, name, city, ...mats) {
  let c = ns.corporation
  c.setSmartSupply(name, city, true)
  for (let mat of mats) {
    c.setSmartSupplyOption(name, city, mat, "leftovers")
  }
}
