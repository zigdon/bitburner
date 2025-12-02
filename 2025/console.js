import { colors } from "/colors.js"

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  var last = { host: "", op: "", total: 0, count: 0 }
  while (true) {
    var data = String(ns.readPort(10))
    if (data == "NULL PORT DATA") {
      await ns.nextPortWrite(10)
      continue
    }
    var words = data.split(" ")
    if (words[0].startsWith("[") && ["Grew", "Weakened", "Hacked"].includes(words[1])) {
      if (last.host == words[0] && last.op == words[1]) {
        last.count++
        last.total += Number(words[3])
        continue
      }
      if (last.host != "") {
        ns.printf(
          "%s%s %s for %s (%d)%s",
          colors["white"],
          last.host, last.op, last.op == "Hacked" ? "$"+ns.formatNumber(last.total) : last.total, last.count,
          colors["reset"],
        )
      }
      last = { host: words[0], op: words[1], total: Number(words[3]), count: 1 }
      continue
    }
    ns.print(data)

    await ns.asleep(10)
  }
}
