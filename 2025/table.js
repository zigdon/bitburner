import {colors, stripColors} from "@/colors.js"
/** 
 * @param {NS} ns
 * @param {[]} headers
 * @param {[[]]} data
 * @return Array
 * */
export function table(ns, headers, data) {
  const getSize = (t) => {
    return stripColors(t).length
  }
  let sizes = headers.map(
    (h, i) => Math.max(h.length, ...data.map(
      (l) => getSize(getText(l[i], true)[0])
    ))
  )
  let fmt = sizes.map((i) => "%s%-" + i + "s%s").join(" │ ")
  let sep = sizes.map((i) => "═".repeat(i)).join("═╪═")
  let rowText = data.map((l) => ns.sprintf(fmt, ...Array.from(l.map((i) => {
      let parse = getText(i)
      let txt = parse[0]
      let color = parse[1]
      if (color) {
        return [colors[color], txt, colors["reset"]]
      }
      return ['', txt, '']
    })).flat()))
  let ret = [
    ns.sprintf(fmt, ...Array.from(headers.map((i) => ['', i, ''])).flat()),
      sep,
      ...rowText.map((r) => r.replaceAll("%", "%%"))]
  return "\n"+ret.join("\n")
}

/**
 * @param {String|List} i
 * @param {Boolean} unformat
 * @return List
 */
function getText(i, unformat) {
  // const fmt = (t) => unformat ? t : t.replaceAll("%", "%%") 
  if (typeof(i) == "object") {
    return [i[0], i[1]]
  }
  return [i, '']
}

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog()
  let h = ["this", "is", "a", "test"]
  let data = [
    ["some", "values", 1234, "other"],
    ["some", "extra values", 1234, "other"],
  ]

  // data.forEach((l) => ns.printf("%v", l))

  ns.tprint("\n"+table(ns, h, data))
}
