export function getCrimes() {
    return [
        { name: "Mug People", money: 3.6, respect: 0.00005, wanted: 0.00005, str: 25, def: 25, dex: 25, agi: 10, cha: 15, hack: 0, difficulty: 1 },
        { name: "Deal Drugs", money: 15, respect: 0.00006, wanted: 0.002, str: 0, def: 0, dex: 20, agi: 20, cha: 60, hack: 0, difficulty: 3.5 },
        { name: "Strongarm Civilians", money: 7.5, respect: 0.00004, wanted: 0.02, str: 25, def: 25, dex: 20, agi: 10, cha: 10, hack: 10, difficulty: 5 },
        { name: "Run a Con", money: 45, respect: 0.00012, wanted: 0.05, str: 5, def: 5, dex: 25, agi: 25, cha: 40, hack: 0, difficulty: 14 },
        { name: "Armed Robbery", money: 114, respect: 0.00014, wanted: 0.1, str: 15, def: 15, dex: 20, agi: 10, cha: 20, hack: 20, difficulty: 20 },
        { name: "Traffick Illegal Arms", money: 174, respect: 0.0002, wanted: 0.24, str: 20, def: 20, dex: 20, agi: 0, cha: 25, hack: 15, difficulty: 32 },
        { name: "Threaten & Blackmail", money: 72, respect: 0.0002, wanted: 0.125, str: 25, def: 0, dex: 25, agi: 0, cha: 25, hack: 25, difficulty: 28 },
        { name: "Human Trafficking", money: 360, respect: 0.004, wanted: 1.25, str: 5, def: 5, dex: 30, agi: 0, cha: 30, hack: 30, difficulty: 36 },
        { name: "Terrorism", money: 0, respect: 0.01, wanted: 6, str: 20, def: 20, dex: 20, agi: 0, cha: 20, hack: 20, difficulty: 36 },
        { name: "Vigilante Justice", money: 0, respect: 0, wanted: -0.001, str: 20, def: 20, dex: 20, agi: 20, cha: 0, hack: 20, difficulty: 1 },
    ]
}

export function getManualCrimeNames() {
    return [
        "Shoplift",
        "Rob Store",
        "Mug",
        "Larceny",
        "Deal Drugs",
        "Bond Forgery",
        "Traffick Arms",
        "Homicide",
        "Grand Theft Auto",
        "Kidnap",
        "Assassination",
        "Heist",
    ];
}

export function manualCrimeStats() {
    // From https://github.com/danielyxie/bitburner/blob/9294ff3e9e6b4065c677a0e1a0cb0dc5e0f4f2c3/src/Crime/Crimes.ts
    return [
        { name: "Shoplift", difficulty: 1 / 20, money: 15e3, time: 2e3, weight: { dexterity: 1, agility: 1 } },
        { name: "Rob Store", difficulty: 1 / 5, money: 400e3, time: 60e3, weight: { hacking: 0.5, dexterity: 2, agility: 1 } },
        { name: "Mug", difficulty: 1 / 5, money: 36e3, time: 4e3, weight: { strength: 1.5, defense: 0.5, dexterity: 1.5, agility: 0.5 } },
        { name: "Larceny", difficulty: 1 / 3, money: 800e3, time: 90e3, weight: { hacking: 0.5, dexterity: 1, agility: 1 } },
        { name: "Deal Drugs", difficulty: 1, money: 120e3, time: 10e3, weight: { charisma: 3, dexterity: 2, agility: 1 } },
        { name: "Bond Forgery", difficulty: 1 / 2, money: 4.5e6, time: 300e3, weight: { hacking: 0.05, dexterity: 1.25 } },
        { name: "Traffick Arms", difficulty: 2, money: 600e3, time: 40e3, weight: { charisma: 1, strength: 1, defense: 1, dexterity: 1, agility: 1 } },
        { name: "Homicide", difficulty: 1, money: 45e3, time: 3e3, weight: { strength: 2, defense: 2, dexterity: 0.5, agility: 0.5 } },
        { name: "Grand Theft Auto", difficulty: 8, money: 1.6e6, time: 80e3, weight: { hacking: 1, strength: 1, dexterity: 4, agility: 2, charisma: 2 } },
        { name: "Kidnap", difficulty: 5, money: 3.6e6, time: 120e3, weight: { charisma: 1, strength: 1, dexterity: 1, agility: 1 } },
        { name: "Assassination", difficulty: 8, money: 12e6, time: 300e3, weight: { strength: 1, dexterity: 2, agility: 1 } },
        { name: "Heist", difficulty: 18, money: 120e6, time: 600e3, weight: { hacking: 1, strength: 1, defense: 1, dexterity: 1, agility: 1, charisma: 1 } },
    ]
}

/**
 * @param {string} name
 * @param {object} stats
 */
export function getManualCrimeEV(name, stats) {
    const crime = manualCrimeStats().find(c => c.name.toLowerCase() == name.toLowerCase());
    if (!crime) { return 0 }
    let value = 0;
    for (let s of ["hacking", "strength", "defense", "dexterity", "agility", "charisma"]) {
        if (!crime.weight[s]) { continue }
        const mult = stats[s + "_mult"] || 1;
        value += crime.weight[s] * stats[s] * mult;
    }
    value /= crime.difficulty;
    value /= 975;  // MaxSkillLevel
    value = Math.min(value, 1);
    value *= crime.money;
    value /= crime.time;

    return value;
}

export function longCrime(s) {
    var crimes = getCrimes().map(c => c.name).map(n => [n, n.replaceAll(/[^A-Z]/g, "")]);
    var match = crimes.filter(c => c[1].toLowerCase() == s.toLowerCase());
    if (match.length == 0) {
        return "";
    }
    return match[0][0];
}

export function longEmp(short) {
    if (!short) { return ""; }
    var long = Object.values(locations)
        .flat(1)
        .map(e => [e.replaceAll(/[^A-Z&0-9]/g, ""), e])
        .filter(e => e[0].toLowerCase() == short.toLowerCase() || e[1].toLowerCase() == short.toLowerCase())
        .map(e => e[1]);
    return String(long || short);
}

export const cities = [
    "Aevum", "Chongqing", "Ishima", "New Tokyo", "Sector-12", "Volhaven",
];

export const materials = {
    "Water": 0.05,
    "Energy": 0.01,
    "Food": 0.03,
    "Plants": 0.05,
    "Metal": 0.1,
    "Hardware": 0.06,
    "Chemicals": 0.05,
    "Drugs": 0.02,
    "Robots": 0.5,
    "Real Estate": 0.005,
    "AI Cores": 0.1,
};

export const locations = {
    "Aevum": [
        "AeroCorp",
        "Bachman & Associates",
        "Clarke Incorporated",
        "Crush Fitness Gym",
        "ECorp",
        "Fulcrum Technologies",
        "Galactic Cybersystems",
        "NetLink Technologies",
        "Aevum Police Headquarters",
        "Rho Construction",
        "Snap Fitness Gym",
        "Summit University",
        "Watchdog Security",
        "Iker Molina Casino"],
    "Chongqing": [
        "KuaiGong International",
        "Solaris Space Systems",
        "Church of the Machine God",
    ],
    "Ishima": [
        "Nova Medical",
        "Omega Software",
        "Storm Technologies",
        "0x6C1",
    ],
    "New Tokyo": [
        "DefComm",
        "Global Pharmaceuticals",
        "Noodle Bar",
        "VitaLife",
    ],
    "Sector-12": [
        "Alpha Enterprises",
        "Blade Industries",
        "Central Intelligence Agency",
        "Carmichael Security",
        "Sector-12 City Hall",
        "DeltaOne",
        "FoodNStuff",
        "Four Sigma",
        "Icarus Microsystems",
        "Iron Gym",
        "Joe's Guns",
        "MegaCorp",
        "National Security Agency",
        "Powerhouse Gym",
        "Rothman University",
        "Universal Energy",
    ],
    "Volhaven": [
        "CompuTek",
        "Helios Labs",
        "LexoCorp",
        "Millenium Fitness Gym",
        "NWO",
        "OmniTek Incorporated",
        "Omnia Cybersystems",
        "SysCore Securities",
        "ZB Institute of Technology",
    ],
    "_global": [
        "Hospital",
        "The Slums",
        "Travel Agency",
        "World Stock Exchange",
    ],
};

export function getFactions() {
    return [
        "Illuminati",
        "Daedalus",
        "The Covenant",
        "ECorp",
        "MegaCorp",
        "Bachman & Associates",
        "Blade Industries",
        "NWO",
        "Clarke Incorporated",
        "OmniTek Incorporated",
        "Four Sigma",
        "KuaiGong International",
        "Fulcrum Secret Technologies",
        "BitRunners",
        "The Black Hand",
        "NiteSec",
        "Aevum",
        "Chongqing",
        "Ishima",
        "New Tokyo",
        "Sector-12",
        "Volhaven",
        "Speakers for the Dead",
        "The Dark Army",
        "The Syndicate",
        "Silhouette",
        "Tetrads",
        "Slum Snakes",
        "Netburners",
        "Tian Di Hui",
        "CyberSec",
        "Bladeburners",
        "Church of the Machine God",
    ];
}

var factionShortNames = [];
function makeFactionNames() {
    for (var f of getFactions()) {
        var shortName = f.replaceAll(/[a-z\- ]*/g, "");
        if (f == "Illuminati") {
            shortName = "Il";
        }
        factionShortNames.push([f, shortName]);
    }
}

export function shortFact(n) {
    if (factionShortNames.length == 0) {
        makeFactionNames();
    }

    for (var f of factionShortNames) {
        if (f[0].toLowerCase() == n.toLowerCase()) {
            return f[1];
        }
    }

    return n;
}

export function longFact(n) {
    if (!n) { return null }
    if (factionShortNames.length == 0) {
        makeFactionNames();
    }

    for (var f of factionShortNames) {
        if (f[1].toLowerCase() == n.toLowerCase()) {
            return f[0];
        }
    }

    return null;
}