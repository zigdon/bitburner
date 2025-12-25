/*
 * @param {any} a
 * @param {any} b
 * @return String
 *
 * Returns the diff if any, or "" if they're identical.
 */
export function diff(ns, a, b) {
  if (typeof(a) != typeof(b)) {
    return [
      ns.sprintf("-: %j", a),
      ns.sprintf("+: %j", b)
    ].join("\n")
  }

  var missing = []
  var extra = []
  for (var i of a) {
    if (!b.includes(i)) {
      missing.push(i)
    }
  }
  for (var i of b) {
    if (!a.includes(i)) {
      extra.push(i)
    }
  }

  if (missing.length > 0 || extra.length > 0) {
    return [
      ns.sprintf("=%j", b),
      ns.sprintf("-%j", missing),
      ns.sprintf("+%j", extra),
    ].join("\n")
  }
  return ""
}

export function parseNumber(num) {
  if (num == Number(num)) { return Number(num) }
  let suf = num[num.length-1]
  let prefix = Number(num.slice(0, num.length-1))
  switch (suf) {
    case "k": return prefix*1000
    case "m": return prefix*1000*1000
    case "b": return prefix*1000*1000*1000
    case "t": return prefix*1000*1000*1000*1000
  }
  return num
}

export function parseTime(str) {
  if (str == Number(str)) { return Number(str) }
  let suf = str[str.length-1]
  let prefix = Number(str.slice(0, str.length-1))
  switch (suf) {
    case "m": return prefix*60
    case "h": return prefix*60*60
  }
  return str
}

export function singleInstance(ns) {
  if (ns.ps().filter((p) => p.filename == ns.getScriptName()).length == 1) {
    return true
  }
  ns.tprintf("Can't launched another instance of %s", ns.getScriptName())
  return false
}
