import {singleInstance} from "@/lib/util.js"
let servers = new Map()

/*
 * @param {NS} ns
 */
export async function main(ns) {
  // at startup:
  //   - read home:/bns/*.json, each should list {pid, host, method, port}, verify
  //     that each one is still running.
  //   - listen on 411
  //
  // <411 $methodname $replyport $id
  // - if we don't have a server, start one (and assign it a port)
  // - if we can't start one, kill the lru ones until we can
  // - if we still can't keep trying
  // - if we do have a server, check that it's still alive
  // - record last-usage
  // >reportport $id $methodname $methodport 


}
