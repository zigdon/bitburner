var ports = {
        WORKERS: 1,
        CONTROLLER: 2,
        CONTROLLER_CTL: 3,
        BUYER_CTL: 4,
        LOGGER: 5,
        WEAKENERS: 6,
        LOGGER_CTL: 7,
        CRON_CTL: 8,
        CPROXY: 9,
        BATCHMON: 10,
        GANGMGR: 11,
        SLEEVEMGR: 12,
        UI: 13,
    };

/* @returns {Object.<string.number>} */
export function getPorts() {
    return ports;
}

export function portName(n) {
    for (var [k, v] of Object.entries(ports)) {
        if (v == n) { return k}
    }
    return "Unknown";
}

var aliases = {
    "logger": ports.LOGGER_CTL,
    "worker": ports.CONTROLLER,
    "ctl": "controller",
};

export function portAlias(s) {
    if (aliases[s]) {
        s = aliases[s];
    }
    if (s == Number(s)) {
        return s;
    }
    s = s.toUpperCase();
    return ports[s] || ports[s+"_CTL"] || ports[s+"MGR"] || ports[s+"MGR"] || s;
}