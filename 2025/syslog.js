import { colors } from "@/colors.js"
var loglevels = [ "CRITICAL", "WARNING", "INFO", "DEBUG" ]

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  var last = new Map()
  while (true) {
    var data = String(ns.readPort(11))
    if (data == "NULL PORT DATA") {
      await ns.nextPortWrite(11)
      continue
    }
    var script, level, msg
    [script, level, msg] = data.split(",", 3)
    level = loglevels[level]
    var c = colors["reset"]
    switch (level) {
      case "CRITICAL":
        c=colors["brightRed"]
        break
      case "WARNING":
        c=colors["red"]
        break
      case "INFO":
        c=colors["white"]
        break
      default:
        c=colors["reset"]
        break
    }

    var now = new Date()
    if (level == "DEBUG" && ["hack.js", "grow.js", "weakened.js"].includes(script)) {
      var words = msg.split(" ")
      var key = script+words[0]
      var cache = last.has(key) ? last.get(key) : {ts: now.getTime(), val: 0, cnt: 0}
      cache.val += Number(words[3])
      cache.cnt++
      if (now.getTime() - cache.ts > 10000) {
        last.delete(key)
        var cmd
        switch (script) {
          case "hack.js":
            cmd = "hacked"
            break
          case "grow.js":
            cmd = "grew"
            break
          case "weaken.js":
            cmd = "weakened"
            breal
          default:
            cmd = "something"
        }
        msg = ns.sprintf("%sx%d %s for %s", words[0], cache.cnt, cmd, (script == "hack.js" ? "$" : "") + ns.formatNumber(cache.val))
      } else {
        last.set(key, cache)
        continue
      }
    }
    
    ns.printf("%s %s[%8s]%s %s", now.toLocaleTimeString(), c, level, colors["reset"], msg)

    await ns.asleep(1)
  }
}
