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
  var m = n % 60;
  m = Math.floor(m*1000)/1000;
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

/**
 * @param {string} timespec
 * @returns {number}
 */
export function parseTime(timespec) {
  if (!timespec) {
    return 0;
  }
  var res = 0;
  var i = timespec.indexOf("h")
  if (i >= 0) {
    var b = timespec.split("h");
    res += b[0] * 60*60*1000;
    timespec = b[1];
  }
  i = timespec.indexOf("m")
  if (i >= 0) {
    var b = timespec.split("m");
    res += b[0] * 60*1000;
    timespec = b[1];
  }

  res += timespec * 1000;

  return res
}