import { colors } from "./colors.js"
import { table } from "./table.js"

export var factions = [
  // From NetscriptDefinitions.d.ts
  "Aevum",
  "Bachman & Associates",
  "BitRunners",
  "Blade Industries",
  "Bladeburners",
  "Chongqing",
  "Church of the Machine God",
  "Clarke Incorporated",
  "CyberSec",
  "Daedalus",
  "ECorp",
  "Four Sigma",
  "Fulcrum Secret Technologies",
  "Illuminati",
  "Ishima",
  "KuaiGong International",
  "MegaCorp",
  "NWO",
  "Netburners",
  "New Tokyo",
  "NiteSec",
  "OmniTek Incorporated",
  "Sector-12",
  "Shadows of Anarchy",
  "Silhouette",
  "Slum Snakes",
  "Speakers for the Dead",
  "Tetrads",
  "The Black Hand",
  "The Covenant",
  "The Dark Army",
  "The Syndicate",
  "Tian Di Hui",
  "Volhaven",
]

var cmds = new Map([
  ["list", listFactions],
  ["show", showFaction],
])

/** @param {NS} ns */
export async function main(ns) {
  var fs = ns.flags([
    ["all", false],
    ["augs", ""],
    ["factions", ""],
  ])
  var cmd = fs._[0]
  if (cmds.has(cmd)) {
    cmds.get(cmd)(ns, fs)
  } else {
    ns.tprintf("Commands: %s", Array.from(cmds.keys()).join(", "))
  }
}


/**
 * @param {NS} ns
 * @param {String} name
 * */
function listFactions(ns, flags) {
  var s = ns.singularity
  var name = flags._[1] || ""
  var data = []
  var joined = getFactions(ns, {all: false})
  var fs = getFactions(ns, {all: true}).filter(
    (f) => f.toLowerCase().includes(name.toLowerCase()))
  if (fs.length == 1) {
    return showFaction(ns, fs[0])
  }

  for (var f of fs) {
    data.push([
      f,
      ns.formatNumber(s.getFactionRep(f)),
      ns.formatNumber(s.getFactionFavor(f)),
      [s.getFactionEnemies(f).length,
        s.getFactionEnemies(f).reduce(
          (a, e) => a || joined.includes(e), false) ? "red" : "green"
      ],
      s.getFactionWorkTypes(f).map((w)=>w[0]).join("").toUpperCase(),
    ])
  }

  ns.tprint(table(ns, ["Name", "Rep", "Favor", "Enemies", "Work Types"], data))
}

function showFaction(ns, f) {
  var s = ns.singularity
  var joined = getFactions(ns, {all: false})
  var enemies = s.getFactionEnemies(f)
  var data = []
  data.push(...[
    ["Rep", ns.formatNumber(s.getFactionRep(f))],
    ["Favor", ns.formatNumber(s.getFactionFavor(f))],
    ["Enemies",
      [enemies.join(", ") || "N/A",
        enemies.reduce((a, e) => a || joined.includes(e), false) ? "red" : "green"],
    ],
    ["Work types", s.getFactionWorkTypes(f).join(", ") || "N/A"],
    ["Reqs:", ""],
  ])

  for (var r of s.getFactionInviteRequirements(f)) {
    let rs = formatReq(ns, r)
    data.push(...rs)
  }

  var owned = ns.singularity.getOwnedAugmentations(true)
  data.push(["Augs:",
    ns.sprintf("%d (%d missing)",
      s.getAugmentationsFromFaction(f).length,
      s.getAugmentationsFromFaction(f).filter(
        (a) => !owned.includes(a)).length,
    )
  ])
  for (var a of s.getAugmentationsFromFaction(f)) {
    data.push(["", [a, owned.includes(a) ? "black" : "red" ]])
  }
  ns.tprint(table(ns, ["Name", f], data))

  return
}

export function getFactions(ns, flags) {
  if (flags["all"]) {
    return factions
  }
  return factions.filter(
    (f) => ns.singularity.getFactionRep(f) > 0
  ).filter(
    (f) => f.includes(flags["factions"] || "")
  )
}

function formatReq(ns, r) {
  let res = []
  let pl = ns.getPlayer()
  switch (r.type) {
    case "money":
      let m = pl.money
      let v = r["money"]
      return [[["  Money"], [ns.formatNumber(v), v > r ? "red" : "green"]]]
    case "skills":
      let s = pl.skills
      for (var skill of Object.keys(r.skills)) {
        res.push(["  "+skill,
          [r.skills[skill], s[skill] < r.skills[skill] ? "red" : "green"]])
      }
      return res
    case "city":
      return [["  City", r.city]]
    case "employedBy":
      return [["  Company", r.company]]
    case "companyReputation":
      return [["  Rep",
        ns.sprintf("%s: %s", r.company, ns.formatNumber(r.reputation))]]
    case "backdoorInstalled":
      let b = ns.getServer(r.server).backdoorInstalled
      return [["  Backdoor", [r.server, b ? "green" : "red" ]]]
    case "numAugmentations":
      let need = r.numAugmentations
      let inst = ns.singularity.getOwnedAugmentations().length
      let pend = ns.singularity.getOwnedAugmentations().length
      return [["  Augs",
        [need, need > pend ? "red" : need > inst ? "yellow" : "green"]]]
    case "someCondition":
      return r.conditions.map(
        (c) => formatReq(ns, c)
      ).flat()
    case "jobTitle":
      let titles = Object.values(pl.jobs)
      return [["  Title",
        [r.jobTitle, titles.includes(r.jobTitle) ? "green" : "red"]]]
    case "karma":
      let k = pl.karma
      return [["  Karma", [r.karma, r.karma > k ? "green" : "red" ]]]
    case "numPeopleKilled":
      let killed = pl.numPeopleKilled
      return [["  Killed",
        [r.numPeopleKilled, r.numPeopleKilled > killed ? "red" : "green" ]]] 
    case "bitNodeN":
      return [["  Bitnode",
        [r.bitNodeN, r.bitNodeN == ns.getResetInfo().currentNode ? "green" : "red" ]]]
    case "sourceFile":
      let sf = ns.singularity.getOwnedSourceFiles().map((s) => s.n)
      return [["  SourceFile",
        [r.sourceFile, sf.includes(r.sourceFile) ? "green" : "red" ]]]
    case "location":
      return [["  Location",
        [r.location, pl.location == r.location ? "green" : "red" ]]]
    case "bladeburnerRank":
      let rank = 0
      try {
        rank = ns.bladeburner.getRank()
      } catch {}
      return [["  Bladeburner Rank",
        [r.bladeburnerRank, rank >= r.bladeburnerRank ? "green" : "red" ]]]
    case "hacknetRAM":
      return [["  Hacknet RAM", r.hacknetRAM]]
    case "hacknetCores":
      return [["  Hacknet cores", r.hacknetCores]]
    case "hacknetLevels":
      return [["  Hacknet levels", r.hacknetLevels]]
    default:
      return [["unknown", ns.sprintf("%j", r)]]
  }
}

