import * as fmt from "/lib/fmt.js";
import {readAssignments} from "/lib/assignments.js";

var assignments;

/** @param {NS} ns **/
export async function main(ns) {
  var found = new Map();
  assignments = readAssignments(ns);
  var cmd = ns.args[0];
  if (!cmd) {
    cmd = "contracts";
  }

  ns.disableLog("ALL");

  await scanFrom(ns, "home", "", 0, found);
  await saveDB(ns, found);

  var start = ns.args[1];
  if (!start) {
    start = "home";
  }
  if (!found.has(start)) {
    let match = [];
    for (let k of found.keys()) {
      if (k.toLowerCase().includes(start.toLowerCase())) {
        match.push(k);
      }
    }
    if (match.length == 0) {
      ns.tprintf("No matches %s", start);
      return;
    } else if (match.length == 1) {
      start = match[0];
      ns.tprintf("Single match: %s", start);
    } else {
      ns.tprintf("Multiple matches for %s: %s", start, match.join(", "))
      return;
    }
  }
  
  var eachFunc;
  var showFunc;
  var mapAcc = new Map();
  switch (cmd) {
    case "map":
      printUp(ns, start, found);
      printFrom(ns, start, found, ns.args[2]);
      break;
    case "hacked":
      eachFunc = function(v) {
        if (v.root && !v.host.startsWith('pserv')) {
          printHost(ns, v);
        }
      }
      break;
    case "assigned":
      eachFunc = function(v) {
        if (!assignments.every(a => a.target != v.host)) {
          printHost(ns, v);
        }
      }
      break;
    case "values":
      var list = [];
      eachFunc = function(v) {
        if (!v.host.startsWith("pserv-")) {
          list.push(v);
        }
      }
      showFunc = function() {
        list.sort((a,b) => {return a.max - b.max});
        list.forEach((h) => {ns.tprintf("%25s: $%s %s", h.host, fmt.int(h.max), assignments.filter(a => a.target == h.host).map(a => a.worker))});
      }
      break;
    case "contracts":
      eachFunc = function(v) {
        v.files.forEach(function(f) {
          if (f.endsWith(".cct")) {
            ns.tprintf("Found a contract %s on %s: %s", f, v.host, ns.codingcontract.getContractType(f, v.host));
          }
        })
      }
      break;
    case "files":
      eachFunc = function(v) {
        if (v.host == "home") {
          return;
        }
        v.files.forEach(function(f) {
          if (!f.endsWith(".cct") && !f.endsWith(".js") && !f.endsWith(".txt")) {
            if (!mapAcc.has(f)) {
              mapAcc.set(f, []);
            }
            var hs = mapAcc.get(f);
            hs.push(v.host);
            mapAcc.set(f, hs);
          }
        })
      }
      break;
    case "orgs":
      eachFunc = function(v) {
        var org = ns.getServer(v.host).organizationName;
        if (!org) { return };
        ns.tprintf("%s: %s", org, v.host);
      }
      break;
    case "reset":
      eachFunc = function(v) {
        ns.kill("worker.js", v.host);
        ns.exec("worker.js", v.host);
      }
      break;
    case "mkaliases":
      eachFunc = function(v) {
        if (v.host == "home" || v.host.startsWith("pserv-")) {
          return;
        }
        ns.tprintf(trailTo(ns, found, v) + ";");
      }
      break;
    case "unalias":
      eachFunc = function(v) {
        if (v.host == "home" || v.host.startsWith("pserv-")) {
          return;
        }
        ns.tprintf("unalias go-%s;", v.host);
      }
      break;
    default:
      ns.tprintf("Unknown command %s", cmd);
      ns.tprintf("cmds: contracts (default), map, hacked, assigned, values, files, orgs, reset, mkaliases, unalias");
      ns.exit();
  }

  if (eachFunc) {
    found.forEach(eachFunc);
  }
  if (mapAcc.size > 0) {
    mapAcc.forEach((hs, f) => {ns.tprintf("%s: %s", f, hs.join(", "))});
  }
  if (showFunc) {
    showFunc();
  }
}

/**
 * @param {NS} ns
 * @param {Map} found
 * @param {Object} host
 */
function trailTo(ns, found, h) {
  var name = h.host;
  var res = [name];
  while (h.parent != "home") {
    res.unshift(h.parent);
    h = found.get(h.parent);
  }
  switch (name) {
    case ".":
      name = "dot";
      break;
    case "I.I.I.I":
      name = "4i";
      break;
  }

  return ns.sprintf("alias go-%s=\"connect %s\"", name, res.join(";connect "));
}

var header = false;
/**
 * @param {NS} ns
 * @param {Object} host
 */
function printHost(ns, host) {
    if (!header) {
      header = true;
      ns.tprintf("%-35s: %5s %8s %4s %5s %17s %9s %s",
          "  NAME", "ROOT", "BACKDOOR", "HACK", "RAM", "VALUE  ", "SECURITY", "WORKER")
    }
    var prefix = " ".repeat(host.depth);
    var postfix = " ".repeat(35-host.depth-host.host.length);
    var assigned = assignments.map((a) => {if (a.target == host.host) { return a.worker }}).filter((a) => { return a });
    ns.tprintf("%s%s%s: %5s %8s %4d %5s %8s/%8s %5.2f/%3d %s",
      prefix, host.host, postfix, host.root, host.backdoor, host["hack"], fmt.memory(host.ram),
      fmt.money(host.curVal), fmt.money(host.max),
      host.curSec, host.minSec, assigned.length ? "(" + assigned + ")" : "");
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {Map} found
 */
function printUp(ns, host, found) {
  var trail = [];
  var parent = found.get(host).parent;
  while (found.has(parent)) {
    trail.unshift(found.get(parent));
    parent = found.get(parent).parent;
  }

  trail.forEach(function(h) {
    printHost(ns, h);
  });
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {Map} found
 * @param {int} limit
 */
function printFrom(ns, host, found, limit) {
  var h = found.get(host);
  if (!limit || limit > h["hack"]) {
    printHost(ns, h);
  }
  h.children.forEach(function (h) {
    printFrom(ns, h, found, limit);
  });
}

/**
 *  @param {NS} ns
 * 	@param {string} host
 *  @param {string} parent
 *  @param {int} depth
 *  @param {Map} found
 *  **/
async function scanFrom(ns, host, parent, depth, found) {
  var hacked = eval("ns.hasRootAccess(host)");
  var backdoor = ns.getServer(host).backdoorInstalled;
  var level = eval("ns.getServerRequiredHackingLevel(host)");
  var maxVal = eval("ns.getServerMaxMoney(host)");
  var ram = eval("ns.getServerMaxRam(host)");
  var ports = eval("ns.getServerNumPortsRequired(host)");
  var minSec = eval("ns.getServerMinSecurityLevel(host)");
  var curSec = eval("ns.getServerSecurityLevel(host)");
  var curVal = eval("ns.getServerMoneyAvailable(host)");
  var files = eval("ns.ls(host)");
  found.set(host, {
    depth: depth,
    host: host,
    root: hacked,
    backdoor: backdoor,
    "hack": level,
    max: maxVal,
    curVal: curVal,
    minSec: minSec,
    curSec: curSec,
    ports: ports,
    ram: ram,
    children: [],
    parent: parent,
    path: [],
    files: files,
  });

  if (found.has(parent)) {
    found.get(parent).children.unshift(host);
    found.get(host).path.unshift(...found.get(parent).path, parent)
  }

  var hosts = eval("ns.scan(host)");
  for (var i = 0; i < hosts.length; i++) {
    if (hosts[i] == parent) {
      continue;
    }
    await scanFrom(ns, hosts[i], host, depth + 1, found);
  }
}

/**
 * @param {NS} ns
 * @param {Map} found
 */
async function saveDB(ns, found) {
  var data = [];
  var pServers = ns.getPurchasedServers();
  var contains = function(item, a) {
    var found = false;
    a.forEach((i) => {
      if (i == item) {
        found = true;
      }})
    return found;
  }
  found.forEach((h) => {
    data.push([h.host, h["hack"], h.max, h.ports, h.root, contains(h.host, pServers), h.path].join("\t"));
  })
  await ns.write("/conf/hosts.txt", data.join("\n"), "w");
}