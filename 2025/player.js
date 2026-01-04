import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  let data = []
  let i = ns.getMoneySources().sinceInstall
  let s = ns.getMoneySources().sinceStart
  let pl = ns.getPlayer()
  let names = [
    "hacking",
    "strength",
    "defense",
    "dexterity",
    "agility",
    "charisma",
    "intelligence",
    "",
    "numPeopleKilled",
    "karma",
    "entropy",
  ]
  for (let p in s) {
    let l = [p, ns.formatNumber(i[p]), ns.formatNumber(s[p]), ""]
    if (names.length > 0) {
      let n = names.shift()
      l.push(n, pl.skills[n] ?? pl[n] ?? "")
    } else {
      l.push("", "")
    }
    data.push(l)
  }
  ns.tprint(
    table(ns, ["Source", "Since Install", "Since Start", "", "Skill", "Value"], data)
  )
}
