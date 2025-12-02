/**
 * @typedef host
 * @property {string} hostname
 * @property {number} hack - hack skill needed
 * @property {number} max - max value of the hist
 * @property {number} ports - number of ports needed for hacking
 * @property {boolean} root - has root access
 * @property {boolean} puchased - was this host purchased by the player
 * @property {string[]} path - route to connect to this host
 **/

/**
 * @param {string} a
 * @param {string} b
 */
export function sorter(a,b) {
    if (a == "home" || b == "home") { return a == "home" ? -1 : 1 };
    let ap = a.startsWith("pserv-");
    let bp = b.startsWith("pserv-");
    let ah = a.startsWith("hacknet-node-");
    let bh = b.startsWith("hacknet-node-");
    if ((ap == bp) || (ah == bh)) { return a.replace(/.*-/, "") - b.replace(/.*-/, "") }
    return a < b ? -1 : 1;
}

/**
*  @param {NS} ns
*  @returns {host[]}
**/
export function hosts(ns) {
return readHosts(ns);
}

/**
 * @param {NS} ns
 * @param {string} host
 * @returns {host}
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
 * @returns {boolean}
 */
export function go(ns, host) {
    let path = getHost(ns, host).path;
    if (!path) {
        ns.tprintf("No path found to %s", host);
        return false;
    }
    path.push(host);
    ns.print(`Path to ${host}: ${path}`);
    while (path.length > 0) {
        let next = path.shift();
        if (!ns.connect(next)) {
            ns.tprintf("Can't connect to %s", next);
            return false;
        }
    }
    return true;
}

let cache = {};
/**
 * @param {NS} ns
 * @returns {host[]}
 */
function readHosts(ns) {
    let data = ns.read("/conf/hosts.txt");
    let res = [];
    data.split("\n").forEach((l) => {
        let b = l.trim().split("\t");
        let h = {
            host: b[0],
            hack: b[1],
            max: b[2],
            ports: b[3],
            root: b[4]=="true",
            purchased: b[5]=="true",
            path: b[6] ? b[6].split(","): [],
        };
        res.push(h);
        cache[h.host] = h;
    })

    return res;
}