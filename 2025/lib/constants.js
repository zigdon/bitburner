export const factionList = [
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

export const gyms = new Map([
  ["Sector-12", "Powerhouse Gym"],
  ["Aevum", "Snap Fitness Gym"],
  ["Volhaven", "Millenium Fitness Gym"],
])

export const univs = new Map([
  ["Sector-12", "Rothman University"],
  ["Volhaven", "ZB Institute of Technology"],
])

export const bbActionTypes = [
  "General", "Contracts", "Operations", "Black Operations"
]

export async function bbActionNames(ns, n) {
  let b = ns.bladeburner
  return {
    General: await b.getGeneralActionNames(),
    Contracts: await b.getContractNames(),
    Operations: await b.getOperationNames(),
    "Black Operations": await b.getBlackOpNames(),
  }[n]
}
