import {collectData} from "@/status.js"

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
  const lid = "#overview-extra-hook-0"
  const uid = "#overview-extra-hook-0"
  const win = eval("window")
  const doc = eval("document")
  const React = win.React
  const ReactDOM = win.ReactDOM
  const bar = doc.querySelector(lid)
  const util = doc.querySelector(uid)
  const player = ns.getPlayer()
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
      (t) => <div>{t[0]}: ${ns.formatNumber(t[1])}</div>
    )

    const width = 8
    let [wt, gt, ht, tot] = [0, 0, 0, 0]
    data.forEach((d) => {
      wt += d.w.length
      ht += d.h.length
      gt += d.g.length
    })
    tot = wt + ht + gt
    wt *= width/tot
    gt *= width/tot
    ht *= width/tot
    const w = "⬜"
    const b = "⬛"
    const mkBar = (l, n) => <div>{l}: {w.repeat(Math.floor(n)) + b.repeat(width-Math.floor(n))}</div>
    lis.unshift(mkBar("W", wt), mkBar("G", gt), mkBar("H", ht))
    
    return (
       lis.slice(0,8)
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
