var commaFmt0 = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 0 });

/**
 * @param {number} n
 * @returns {string}
 */
export function int(n) {
    return commaFmt0.format(n);
}

/**
 * @param {string} n
 * @return {number}
 */
export function parseMem(n) {
    if (n == Number(n)) {
      return Number(n);
    }
    var suffix = n[n.length-1];
    n = Number(n.splice(0, n.length-1));
    switch(suffix) {
        case "pb":
            n *= 1000;
        case "tb":
            n *= 1000;
    }

    return n;
}

/**
 * @param {string} s
 * @returns {number}
 */
export function parseNum(s) {
  if (s == Number(s)) {
    return Number(s);
  }
  var suf = s.substr(s.length-1);
  var n = Number(s.substring(0, s.length-1));
  switch (suf) {
    case "p":
      n*=1000;
    case "t":
      n*=1000;
    case "g":
      n*=1000;
    case "m":
      n*=1000;
    case "k":
      n*=1000;
      break;
    default:
      n="unknown suffix " + suf;
  }

  return n;
}

/**
 * @param {number} n
 * @returns {string}
 */
export function large(n, suffix = ["", "k", "m", "b", "t", "q"]) {
  while (n >= 1000 && suffix.length > 1) {
    n /= 1000;
    suffix.shift();
  }
  return n.toFixed(2) + suffix[0];
}

/**
 * @param {number} n
 * @returns {string}
 */
export function memory(n) {
  return large(n, ["GB", "TB", "PB"]);
}

/**
 * @param {number} n
 * @returns {string}
 */
export function money(n) {
  return "$"+large(n);
}

/**
 * @param {number} n
 * @returns {string}
 */
export function time(n) {
  var res = [];
  if (Number(n) != n) {
    return n;
  }
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
  if (n) {
    res.unshift(n+"d");
  }

  return res.join("");
}

var debug = 1;
/**
 * @param {number} level
 */
/* obsolete?
export function setLevel(level) {
  debug = 1;
}
*/

/**
 * @param {NS} ns
 * @param {int} lvl
 * @param {string} tmpl
 * @param {string[]} ..args
 */
/* obsolete?
export function log(ns, lvl, tmpl, ...args) {
    if (lvl > debug) {
        return;
    }
    var now = new Date();
    tmpl = ns.sprintf("%s - %s", now.toLocaleTimeString("en-US", { timeZone: "PST" }), tmpl);
    ns.print(ns.sprintf(tmpl, ...args));
}
 */

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