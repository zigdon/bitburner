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
            var words = f.split(" ");
            var shortName = words.map((w) => { return w[0] }).join("");
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

    return n;
}