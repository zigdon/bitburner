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

export const bbActionTypes = [
  "General", "Contracts", "Operations", "Black Operations"
]

export function bbActionNames(ns, n) {
  let b = ns.bladeburner
  return {
    General: b.getGeneralActionNames(),
    Contracts: b.getContractNames(),
    Operations: b.getOperationNames(),
    "Black Operations": b.getBlackOpNames(),
  }[n]
}
