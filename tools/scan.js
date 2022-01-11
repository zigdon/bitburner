var commaFmt = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 2});

/** @param {NS} ns **/
export async function main(ns) {
  var found = new Map();
  var cmd = ns.args[0];
  if (!cmd) {
    cmd = "contracts";
  }
  var start = ns.args[1];
  if (!start) {
    start = "home";
  }

  ns.disableLog("ALL");

  await scanFrom(ns, "home", "", 0, found);

  var runFunc;
  var show = new Map();
  switch (cmd) {
    case "map":
      printUp(ns, start, found);
      printFrom(ns, start, found, ns.args[2]);
      break;
    case "hacked":
      runFunc = function(v) {
        if (v.root && !v.host.startsWith('pserv')) {
          printHost(ns, v);
        }
      }
      break;
    case "contracts":
      runFunc = function(v) {
        v.files.forEach(function(f) {
          if (f.endsWith(".cct")) {
            ns.tprintf("Found contract on %s (%s): %s",
              v.host, trailTo(ns, found, v), f);
          }
        })
      }
      break;
    case "files":
      runFunc = function(v) {
        if (v.host == "home") {
          return;
        }
        v.files.forEach(function(f) {
          if (!f.endsWith(".cct") && f != "worker.js") {
            if (!show.has(f)) {
              show.set(f, []);
            }
            var hs = show.get(f);
            hs.push(v.host);
            show.set(f, hs);
          }
        })
      }
      break;
    case "orgs":
      runFunc = function(v) {
        var org = ns.getServer(v.host).organizationName;
        if (!org) { return };
        ns.tprintf("%s: %s", org, v.host);
      }
      break;
    case "reset":
      runFunc = function(v) {
        ns.kill("worker.js", v.host);
        ns.exec("worker.js", v.host);
      }
      break;
    case "mkaliases":
      runFunc = function(v) {
        if (v.host == "home" || v.parent == "home") {
          return;
        }
        ns.tprintf(trailTo(ns, found, v) + ";");
      }
    default:
      ns.tprintf("Unknown command %s", cmd);
      ns.tprintf("cmds: contracts (default), map, hacked, files, orgs, reset, mkaliases");
      ns.exit();
  }

  if (start != "home") {
    ns.tprintf(trailTo(ns, found, found.get(start)));
  }

  if (runFunc) {
    found.forEach(runFunc);
  }
  if (show.size > 0) {
    show.forEach((hs, f) => {ns.tprintf("%s: %s", f, hs.join(", "))});
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

/**
 * @param {NS} ns
 * @param {Object} host
 */
function printHost(ns, host) {
    var prefix = " ".repeat(host.depth);
    ns.tprintf("%s%s: %s %d %s",
      prefix, host.host, host.root, host.hack,
      commaFmt.format(host.max));
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
  if (!limit || limit > h.hack) {
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
  var hra = eval("ns.hasRootAccess(host)");
  var rhl = eval("ns.getServerRequiredHackingLevel(host)");
  var smm = eval("ns.getServerMaxMoney(host)");
  var ports = eval("ns.getServerNumPortsRequired(host)");
  var files = eval("ns.ls(host)");
  found.set(host, {
    depth: depth,
    host: host,
    root: hra,
    hack: rhl,
    max: smm,
    ports: ports,
    children: [],
    parent: parent,
    files: files,
  });

  if (found.has(parent)) {
    found.get(parent).children.unshift(host);
  }

  var hosts = eval("ns.scan(host)");
  for (var i = 0; i < hosts.length; i++) {
    if (hosts[i] == parent) {
      continue;
    }
    await scanFrom(ns, hosts[i], host, depth + 1, found);
  }
}