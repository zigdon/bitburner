import {table} from "@/table.js"
import {nsRPC} from "@/lib/nsRPC.js"

/** @param {NS} ons */
export async function main(ons) {
  ons.ramOverride(1.7)
  let ns = new nsRPC(ons)
  let data = []
  let s = ns.singularity
  for (let c of Object.keys(ns.enums.CrimeType)) {
    let t = await s.getCrimeStats(c) // = {} // 
    let ch = await s.getCrimeChance(c)
    data.push([
      c,
      ns.sprintf("%.2f", ch*100),
      ns.sprintf("%.2f", t.difficulty ??0),
      t.karma,
      t.kills,
      "$"+ns.formatNumber(t.money),
      "$"+ns.formatNumber(t.money * ch),
      ns.tFormat(t.time ?? 0),
      "$"+ns.formatNumber(t.money/(t.time ?? 1))+"/s",
      "$"+ns.formatNumber((t.money * ch)/(t.time ?? 1))+"/s",
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
    "Estimated",
    "Time",
    "$/s",
    "$Est/s",
    "H",
    "S",
    "De",
    "Dx",
    "A",
    "C",
    "I",
  ], data))
}

