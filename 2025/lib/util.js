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
