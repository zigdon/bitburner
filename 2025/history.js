import {table} from "@/table.js"
import {colors} from "@/colors.js"
import {parseTime} from "@/lib/util.js"

/*
 * @param {NS} ns
 */
export async function main(ns) {
  let hist = parseTime(ns.args[0] ?? "6h")
  hist *= 1000
  let data = JSON.parse(
    "["+ns.read("logs/player.json").split("\n").filter(
      (l) => l.length>0
    ).join(",")+"]")
  let limit = Date.now()-hist*1e3
  let out = []
  let tz = new Date().getTimezoneOffset()*60*1e6
  const df = (ts) => {
    let d = new Date(1970, 0, 0, 0, 0, 0, ts-tz)
    return ns.sprintf("%02d-%02d %d:%02d",
      d.getMonth()+1,
      d.getDate(),
      d.getHours(),
      d.getMinutes()
    )
  }
  ns.tprintf("hist=%d", hist)
  ns.tprintf("entries=%d", data.length)
  if (hist > 60*60*1e3) { // hours
    data = data.filter((_, i) => i % 10 == 0)
    ns.tprintf("entries=%d", data.length)
  }
  for (let d of data) {
    if (d.ts < limit) continue
    out.push([
      df(d.ts),
      d.player.hp.max,
      d.player.skills.hacking,
      d.player.skills.strength,
      d.player.skills.defense,
      d.player.skills.dexterity,
      d.player.skills.agility,
      d.player.skills.charisma,
      d.player.skills.intelligence,
      "$"+ns.formatNumber(d.player.money),
      d.player.karma,
    ])
  }

  ns.tprintf(table(ns, ["Time", "HP", "H", "S", "Df", "Dx", "A", "C", "I", "Money", "Karma"], out))
}
