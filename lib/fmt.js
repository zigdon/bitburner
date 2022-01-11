var commaFmt0 = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 0 });

/**
 * @param {number} n
 * @returns {string}
 */
export function int(n) {
    return commaFmt0.format(n);
}

/**
 * @param {number} n
 * @returns {string}
 */
export function time(n) {
  var res = [];
  n /= 1000;
  n = Math.floor(n);
  var m = n % 60;
  if (m) {
    res.unshift(m+"s");
  }
  n = Math.floor(n/60);
  m = n % 60;
  if (m) {
    res.unshift(m+"m");
  }
  n = Math.floor(n/60);
  m = n % 24;
  if (m) {
    res.unshift(m+"h");
  }
  n = Math.floor(n/24);
  if (m) {
    res.unshift(m+"d");
  }

  return res.join("");
}

var debug = 1;
/**
 * @param {number} level
 */
export function setLevel(level) {
  debug = 1;
}

/**
 * @param {NS} ns
 * @param {int} lvl
 * @param {string} tmpl
 * @param {string[]} ..args
 */
export function log(ns, lvl, tmpl, ...args) {
    if (lvl > debug) {
        return;
    }
    var now = new Date();
    tmpl = ns.sprintf("%s - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), tmpl);
    ns.print(ns.sprintf(tmpl, ...args));
}