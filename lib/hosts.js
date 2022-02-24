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
    if (Object.keys(cache).length == 0) {
        readHosts(ns);
    }
    return cache[host];
}

/**
 * @param {NS} ns
 * @param {string} host
 */
export function go(ns, host) {
    var path = getHost(ns, host).path;
    if (!path) {
        ns.tprintf("No path found to %s", host);
        return false;
    }
    path.push(host);
    ns.print(`Path to ${host}: ${path}`);
    while (path.length > 0) {
        var next = path.shift();
        if (!ns.connect(next)) {
            ns.tprintf("Can't connect to %s", next);
            return false;
        }
    }
    return true;
}

/**
 * @param {NS} ns
 * @returns {Object[]}
 */
var cache = {};
function readHosts(ns) {
    var data = ns.read("/conf/hosts.txt");
    var res = [];
    data.split("\n").forEach((l) => {
        var b = l.trim().split("\t");
        var h = {
            host: b[0],
            hack: b[1],
            max: b[2],
            ports: b[3],
            root: b[4]=="true",
            purchased: b[5],
            path: b[6] ? b[6].split(","): [],
        };
        res.push(h);
        cache[h.host] = h;
    })

    return res;
}