import {table} from "@/table.js"

/** @param {NS} ns */
export async function main(ns) {
  let data = []
  let s = ns.singularity
  for (let c of Object.keys(ns.enums.CrimeType)) {
    let t = s.getCrimeStats(c) // = {} // 
    data.push([
      c,
      ns.sprintf("%.2f", s.getCrimeChance(c)*100),
      ns.sprintf("%.2f", t.difficulty ??0),
      t.karma,
      t.kills,
      "$"+ns.formatNumber(t.money ?? 0),
      ns.tFormat(t.time ?? 0),
      "$"+ns.formatNumber((t.money ?? 0)/(t.time ?? 1))+"/s",
      Math.round(t.hacking_exp),
      Math.round(t.strength_exp),
      Math.round(t.defense_exp),
      Math.round(t.dexterity_exp),
      Math.round(t.agility_exp),
      Math.round(t.charisma_exp),
      Math.round(t.intelligence_exp),
    ])
  }

  ns.tprint(table(ns, [
    "Name",
    "Chance",
    "Difficulty",
    "Karma",
    "Kills",
    "Loot",
    "Time",
    "$/s",
    "H",
    "S",
    "De",
    "Dx",
    "A",
    "C",
    "I",
  ], data))
}

