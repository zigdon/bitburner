let commaFmt0 = new Intl.NumberFormat('en-US', { useGrouping: true });

/**
 * @returns {string}
 */
export function bool(n) {
  return n ? "++" : "--";
}


/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function int(n, { digits = 0 } = {}) {
  return commaFmt0.format(Number(n).toFixed(digits));
}

/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function pct(n, { digits = 0, fmtstring = false } = {}) {
  if (isNaN(n)) {
    return "--";
  }
  n = Number(n) * 100;
  n = n.toFixed(digits);
  return sprintf("%f%s", n, fmtstring ? "%%" : "%");
}

/**
 * @param {string} s
 */
export function initial(s) {
  let words = s.split(" ");
  return words.map(w => w[0]).join("");
}

/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function gain(n, { digits = 0, fmtstring = false } = {}) {
  n -= 1;
  return pct(n, {digits: digits, fmtstring: fmtstring});
}

/**
 * @param {Object} o
 */
export function object(o) {
  let res = [];
  for (let [k, v] of Object.entries(o)) {
    if (typeof(v) == "object") {
      v = Object.entries(v).join(", ");
    }
    res.push([k, v]);
  }

  return table(res);
}

/**
 * @param {string} n
 * @return {number}
 */
export function parseMem(n) {
  if (n == Number(n)) {
    return Number(n);
  }
  let suffix = n.substr(n.length-2);
  n = Number(n.substr(0, n.length - 2));
  switch (suffix) {
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
  let suf = s.substr(s.length - 1);
  let n = Number(s.substring(0, s.length - 1));
  switch (suf) {
    case "q":
    case "p":
      n *= 1000;
    case "t":
      n *= 1000;
    case "g":
    case "b":
      n *= 1000;
    case "m":
      n *= 1000;
    case "k":
      n *= 1000;
      break;
    default:
      n = "unknown suffix " + suf;
  }

  return n;
}

/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function large(n, { suffix = ["", "k", "m", "b", "t", "qa", "qi", "sx", "sp", "oc", "no", "dc", "ud", "ddc", "tdc"], digits = 2 } = {}) {
  while (Math.abs(n) >= 1000 && suffix.length > 1) {
    n /= 1000;
    suffix.shift();
  }
  return n.toFixed(digits) + suffix[0];
}

/**
 * @param {number} n
 * @returns {string}
 */
export function memory(n, {digits = 0}={}) {
  return large(n, { suffix: ["GB", "TB", "PB"], digits: digits });
}

/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function money(n, {digits = 0}={}) {
  let neg = n < 0;
  n = neg ? Number(-n) : Number(n);
  return (neg ? "-" : "") + "$" + large(n, { digits: digits });
}

/**
 * @param {number} n
 * @param {object} opts
 * @returns {string}
 */
export function time(n, {digits=0} = {}) {
  let res = [];
  if (Number(n) != n) {
    return n;
  }
  n /= 1000;
  let m = Number(n % 60);
  m = m.toFixed(digits);
  if (m) {
    res.unshift(m + "s");
  }
  n = Math.floor(n / 60);
  m = n % 60;
  if (m) {
    res.unshift(m + "m");
  }
  n = Math.floor(n / 60);
  m = n % 24;
  if (m) {
    res.unshift(m + "h");
  }
  n = Math.floor(n / 24);
  m = n % 24;
  if (m) {
    res.unshift(m + "d");
  }
  n = Math.floor(n / 365);
  if (n) {
    res = [int(n) + "y"];
  }

  return res.join("");
}

/**
 * @param {string} timespec
 * @returns {number}
 */
export function parseTime(timespec) {
  if (!timespec) {
    return 0;
  }
  let res = 0;
  let i = timespec.indexOf("h")
  if (i >= 0) {
    let b = timespec.split("h");
    res += b[0] * 60 * 60 * 1000;
    timespec = b[1];
  }
  i = timespec.indexOf("m")
  if (i >= 0) {
    let b = timespec.split("m");
    res += b[0] * 60 * 1000;
    timespec = b[1];
  }

  res += timespec.split("s")[0] * 1000;

  return res
}

/**
 * @param {string[][]} data
 * @param {string[]} headers
 * @param {function[]} fmts
 */
export function table(data, headers = [], fmts = []) {
  let res = [];
  let widths = [];
  let cols = 0;
  for (let i = 0; i < headers.length; i++) {
    if (typeof(headers[i]) == 'object') {
      [headers[i], fmts[i]] = headers[i];
    }
  }
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].length > widths[i] || !widths[i]) {
      widths[i] = headers[i].length;
    }
  }

  for (let l of data) {
    if (l.length > cols) {
      cols = l.length;
    }
    for (let i = 0; i < l.length; i++) {
      if (fmts[i]) {
        l[i] = fmts[i](l[i]);
      } else if (l[i] === undefined) {
        l[i] = "-";
      }
      let len = String(l[i]).length
      if (len > widths[i] || !widths[i]) {
        widths[i] = len;
      }
    }
  }

  let fields = [];
  for (let i = 0; i < cols; i++) {
    if (widths[i]) {
      fields.push("%" + widths[i] + "s");
    } else {
      fields.push("%s");
    }
  }
  let tmpl = fields.join(" | ");
  if (headers.length > 0) {
    res.push(sprintf(tmpl, ...headers.map(h => h.toUpperCase())));
  }
  for (let l of data) {
    while (l.length < cols) {
      l.push("-")
    }
    res.push(sprintf(tmpl, ...l));
  }

  return res.join("\n");
}