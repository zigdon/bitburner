import {colors, stripColors} from "@/colors.js"
/** 
 * @param {NS} ns
 * @param {[]} headers
 * @param {[[]]} data
 * @return Array
 * */
export function table(ns, headers, data) {
  var sizes = headers.map((h, i) => Math.max(h.length, ...data.map((l) => getSize(ns, getText(l[i])[0]))))
  var fmt = sizes.map((i) => "%s%-" + i + "s%s").join(" │ ")
  var sep = sizes.map((i) => "═".repeat(i)).join("═╪═")
  var rowText = data.map((l) => ns.sprintf(fmt, ...Array.from(l.map((i) => {
      var parse = getText(i)
      var txt = parse[0]
      var color = parse[1]
      if (color) {
        return [colors[color], txt, colors["reset"]]
      }
      return ['', txt, '']
    })).flat()))
  var ret = [
    ns.sprintf(fmt, ...Array.from(headers.map((i) => ['', i, ''])).flat()),
      sep,
      ...rowText]
  return "\n"+ret.join("\n")
}

/**
 * @param {String|List} i
 * @return List
 */
function getText(i) {
  if (typeof(i) == "object") {
    return [i[0], i[1]]
  }
  return [i, '']
}

/**
 * @param {NS} ns
 * @param {Any} t
 * @return Number
 */
function getSize(ns, t) {
  return stripColors(t).length
}

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog()
  var h = ["this", "is", "a", "test"]
  var data = [
    ["some", "values", 1234, "other"],
    ["some", "extra values", 1234, "other"],
  ]

  // data.forEach((l) => ns.printf("%v", l))

  ns.tprint("\n"+table(ns, h, data))
}
