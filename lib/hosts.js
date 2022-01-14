/**
 *  @param {NS} ns
 *  @returns {Object[]}
 **/
export function hosts(ns) {
    return readHosts(ns);
}

/**
 * @param {NS} ns
 * @param {string} host
 * @returns {Object}
 */
export function getHost(ns, host) {
    if (cache.size == 0) {
        readHosts(ns);
    }
    return cache.get(host);
}

/**
 * @param {NS} ns
 * @returns {Object[]}
 */
var cache = new Map();
function readHosts(ns) {
    var data = ns.read("/lib/hosts.txt");
    var res = [];
    data.split("\n").forEach((l) => {
        var b = l.trim().split("\t");
        var h = {host: b[0], hack: b[1], max: b[2], ports: b[3], root: b[4]=="true", purchased: b[5]};
        res.push(h);
        cache.set(h.host, h);
    })

    return res;
}