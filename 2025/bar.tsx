import {collectData} from "@/status.js"
import {dns} from "@/hosts.js"

interface SumServer {
  srv: Server
  mon: number
  h: number[]
  w: number[]
  g: number[]
  hack: number
  when: number
}

export async function main(ns : NS) {
  [
    "asleep",
    "getServerBaseSecurityLevel",
    "getServerMinSecurityLevel",
    "getServerMoneyAvailable",
    "getServerSecurityLevel",
  ].forEach((f) => ns.disableLog(f))
  const lid = "#overview-extra-hook-0"
  const uid = "#overview-extra-hook-0"
  const win = eval("window")
  const doc = eval("document")
  const React = win.React
  const ReactDOM = win.ReactDOM
  const bar = doc.querySelector(lid)
  const util = doc.querySelector(uid)
  const player = ns.getPlayer()
  const hosts = dns(ns)
  const Ledger = () => {
    const sum = (l:number[]) => l.reduce((a:number,i:number) => a + i, 0)
    const loot = (ent: SumServer) => 
      ns.fileExists("Formulas.exe") ?
        ns.formulas.hacking.hackPercent(ent.srv, player) * sum(ent.h) * ent.mon
        : ent.hack * sum(ent.h)
  
    let data : SumServer[] = Array.from(collectData(ns).values())
    let timeline : number[] = []
    data.filter(
      (v) => v.h.length > 0 && v.when > 0
    ).sort(
      (a,b) => a.when - b.when
    ).map(
      (v) => [Math.floor(v.when/1000), loot(v)]
    ).forEach(
      (v) => timeline[v[0]] = (timeline[v[0]] ?? 0) + v[1]
    )

    let lis = timeline.map(
      (t, i) => [i, t]
    ).filter(
      (t) => t[1] > 0
    ).map(
      (t) => <div>{t[0]}: ${ns.formatNumber(t[1], 0)}</div>
    )

    const width = 20
    let [wt, gt, ht, tot] = [0, 0, 0, 0]
    data.forEach((d) => {
      wt += sum(d.w)
      ht += sum(d.h)
      gt += sum(d.g)
    })
    tot = sum(
      Array.from(hosts.values()).filter(
        (h) => h.root
      ).map(
        (h) => h.ram
      )
    )*1.75
    ns.printf("w: %d, g: %d, h: %d, total: %d", wt, gt, ht, tot)
    wt = Math.ceil(wt*width/tot)
    gt = Math.ceil(gt*width/tot)
    ht = Math.ceil(ht*width/tot)
    ns.printf("w: %d, g: %d, h: %d, total: %d", wt, gt, ht, tot)
    const w = "↧"
    const g = "↥"
    const h = "🞋"
    const idle = "_"
    lis.unshift(
      w.repeat(wt) +
      g.repeat(gt) +
      h.repeat(ht) +
      idle.repeat(Math.max(width-wt-gt-ht, 0))
    )
    
    return (
       lis.slice(0,6)
    )
  }

  const Util = () => {
    return (
      <div>
      <div>W: {mkBar(wt)}</div>
      <div>G: {mkBar(gt)}</div>
      <div>H: {mkBar(ht)}</div>
      </div>
    )
  }

  if (bar && util) {
    ns.atExit(()=>bar.innerHTML="")
    while (true) {
      await ns.asleep(1000)
      ReactDOM.render(
        <React.StrictMode>
          <Ledger/>
        </React.StrictMode>,
        bar
      )
    }
  } else {
    ns.tprint("Can't find bar")
  }
}
