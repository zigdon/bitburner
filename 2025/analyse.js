import { table } from "@/table.js"
/** @param {NS} ns */
export async function main(ns) {
  var fs = ns.flags([
    ["detail", false],
  ])
  var host = fs._[0]
  var f = ns.sprintf("/logs/%s.txt", host)
  if (!ns.fileExists(f)) {
    ns.tprintf("No logs found for %s", host)
    ns.ls("home", "/logs/").map(
      (f) => f.split("/")[1].split(".")[0]
    ).forEach((f) => ns.tprintf(f))
    return
  }

  var data = []
  // ts,script,amt
  var last = {type:"", amt:0, cnt:0, start:0, end:0}
  // group all events of the same kind
  for (var l of ns.read(f).split("\n")) {
    var [ts, script, amt] = l.split(",")
    if (last.type != script) {
      if (last.type != "") {
        data.push([
          last.type,
          last.type == "hack.js" ?
            "$"+ns.formatNumber(last.amt) :
            ns.formatNumber(last.amt),
          last.cnt,
          last.end-last.start > 1000 ?
            ns.tFormat(last.end-last.start) :
            last.end-last.start + " ms",
          ts-last.end > 1000 ?
            ns.tFormat(ts-last.end) :
            ts-last.end + " ms",
        ])
      }
      last = {type:script, amt:0, cnt:0, start:ts, end:0}
    }
    last.amt += Number(amt)
    last.cnt++
    last.end=ts
  }
  if (last.start > 0) {
    data.push([
      last.type,
      last.type == "hack.js" ?
        "$"+ns.formatNumber(last.amt) :
        ns.formatNumber(last.amt),
      last.cnt,
      last.end-last.start > 1000 ?
        ns.tFormat(last.end-last.start) :
        last.end-last.start + " ms",
      ts-last.end > 1000 ?
        ns.tFormat(ts-last.end) :
        ts-last.end + " ms",
    ])
  }

  ns.tprint(table(ns, ["What", "Amt", "Count", "Duration", "Delta"], data))
}

/**
 * @param {AutocompleteData} data - context about the game, useful when autocompleting
 * @param {string[]} args - current arguments, not including "run script.js"
 * @returns {string[]} - the array of possible autocomplete options
 */
export function autocomplete(data, args) {
  if (args[0] != undefined) {
    return [ ...data.servers.filter((h) => h.includes(args[0])) ]
  }
  return [...data.servers];
}

