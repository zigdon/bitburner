import {info} from "@/log.js"
/** @param {NS} ns */
export async function main(ns) {
  let [div, city] = ns.args
  let c = ns.corporation
  c.upgradeOfficeSize(div, city, 5)
  let office = c.getOffice(div, city)
  let hc = office.size - office.numEmployees
  while (c.hireEmployee(div, city)) {
    await ns.asleep(1)
  }
  office = c.getOffice(div, city)
  let jobs = office.employeeJobs
  let pos = ["Operations","Engineer","Business","Management","Research & Development"]
  while (jobs.Unassigned > 0) {
    await ns.asleep(1)
    jobs[pos[0]]++
    jobs.Unassigned--
    pos.unshift(pos.pop())
  }
  for (let p of pos) {
    if (c.setAutoJobAssignment(div, city, p, jobs[p])) {
      ns.printf("Set %s@%s %s to %d", div, city, p, jobs[p])
    } else {
      ns.tprintf("Failed to set %s@%s %s to %d", div, city, p, jobs[p])
    }
  }
  // ns.tprintf("Hired %d new employees for %s@%s: %j", hc, div, city, jobs)
  await info(ns, "Hired %d new employees for %s@%s: %j", hc, div, city, jobs)
}
