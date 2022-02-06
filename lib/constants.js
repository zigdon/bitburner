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

export function longCrime(s) {
    var crimes = getCrimes().map(c => c.name).map(n => [n, n.replaceAll(/[^A-Z]/g, "")]);
    var match = crimes.filter(c => c[1].toLowerCase() == s.toLowerCase());
    if (match.length == 0) {
        return "";
    }
    return match[0][0];
}

export function getLocations() {
    var loc = new Map();
    loc.set("Aevum", [
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
        "Iker Molina Casino"]);
    loc.set("Chongqing", [
        "KuaiGong International",
        "Solaris Space Systems",
        "Church of the Machine God",
    ]);
    loc.set("Ishima", [
        "Nova Medical",
        "Omega Software",
        "Storm Technologies",
        "0x6C1",
    ]);
    loc.set("New Tokyo", [
        "DefComm",
        "Global Pharmaceuticals",
        "Noodle Bar",
        "VitaLife",
    ]);
    loc.set("Sector-12", [
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
    ]);
    loc.set("Volhaven", [
        "CompuTek",
        "Helios Labs",
        "LexoCorp",
        "Millenium Fitness Gym",
        "NWO",
        "OmniTek Incorporated",
        "Omnia Cybersystems",
        "SysCore Securities",
        "ZB Institute of Technology",
    ]);
    loc.set(null, [
        "Hospital",
        "The Slums",
        "Travel Agency",
        "World Stock Exchange",
    ])
    return loc;
}

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