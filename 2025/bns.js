import {dns} from "@/hosts.js"
import {table} from "@/table.js"
import {debug, info, warning} from "@/log.js"
import {singleInstance} from "@/lib/util.js"

// at startup:
//   - read home:/bns/*.json, each should list {pid, host, method, port}, verify
//     that each one is still running.
//   - listen on 411
//
// <411 BNSMessage(find)
// - if we don't have a server, start one (and assign it a port)
// - if we can't start one, kill the lru ones until we can
// - if we still can't keep trying
// - if we do have a server, check that it's still alive
// - record last-usage
// >$replyport $id $methodname $methodport 
// >$replyport $id NOK
//
// <411 BNSMessage(register, {RPCServer})
// >$replyport $id OK/NOK $msg
// <411 BNSMessage(unregister, {RPCServer})
// >$replyport $id OK/NOK $msg

/*
 * @param {NS} ns
 */
export async function main(ns) {
  if (!singleInstance(ns)) return
  let bns = new BNS(ns)
  ns.printf("Starting listener")
  await bns.listen()
  ns.printf("Listen returned")
}

/**
 * @interface BNSMessage
 * @property {string} cmd - {find, register, unregister}
 * @property {number} replyTo - what port should the reply be sent to
 * @property {number} id - sequence number
 * @property {string} msg - text contents
 * @property {any} payload - structured contents
 */

/**
 * @interface RPCServer
 * @property {number} pid - PID of the server.
 * @property {string} host - where the server is running.
 * @property {string} method - namespace.method served.
 * @property {number} port - port listened on
 */

/**
 * @interface LRU
 * @property {string} method
 * @property {number} ts - timestamp of last-use
 */

class BNS {
  /** @type {NS} _ns */
  _ns

  /** @type {Map<string, RPCServer} */
  _servers = new Map()

  /** @type {LRU[]} */
  _lru = []

  // How long should it be since a server was last used before we OOM it?
  lruTimeout = 10 * 1e3   // 10s
  // How long should it be since a server was last used before we shut it down?
  timeout = 5 * 60 * 1e3  // 5m
  bnsPath = "data/bns/%s.json"
  serverPath = "lib/rpc/%s.js"
  nextPort = 1e6

  /** @param {NS} ns */
  constructor(ns) {
    this._port = 411
    this._ns = ns

    this.silent = [
      "asleep",
      "getServerUsedRam",
      "scp",
    ]

    // Some sugar
    this.asleep = ns.asleep
    this.exec = ns.exec
    this.fileExists = ns.fileExists
    this.formatRam = ns.formatRam
    this.getPortHandle = ns.getPortHandle
    this.getScriptRam = ns.getScriptRam
    this.getServerUsedRam = ns.getServerUsedRam
    this.isRunning = ns.isRunning
    this.kill = ns.kill
    this.ls = ns.ls
    this.read = ns.read
    this.rm = ns.rm
    this.scp = ns.scp
    this.sprintf = ns.sprintf
    this.write = ns.write

    // Some quiet
    this.silent.forEach((f) => ns.disableLog(f))
    this._loadServers()
  }

  /** @param {string} tmpl
   * @param {any[]} args
   */
  async warning(tmpl, ...args) {
    await warning(this._ns, tmpl, ...args)
  }

  /** @param {string} tmpl
   * @param {any[]} args
   */
  async log(tmpl, ...args) {
    await info(this._ns, tmpl, ...args)
  }

  /** @param {string} tmpl
   * @param {any[]} args
   */
  async debug(tmpl, ...args) {
    let ts = new Date().toLocaleTimeString()
    this._ns.printf(ts+" "+tmpl, ...args)
  }

  status() {
    let data = []
    let now = Date.now()
    this._lru.forEach(
      (l) => {
        let srv = this._servers.get(l.method)
        if (!srv) return
        data.push([
          l.method,
          srv.host,
          srv.port,
          this._ns.tFormat(now-l.ts),
        ])
      }
    )
    if (data.length > 0) {
      this.debug("LRU:")
      this._ns.printf(table(this._ns, ["Name", "Host", "Port", "Age"], data))
    }
  }

  // BNS public methods
  async listen() {
    let ph = this.getPortHandle(this._port)
    let reaperTS = Date.now()
    while (true) {
      while (ph.peek() == "NULL PORT DATA") {
        await this.asleep(100)
        if (Date.now() - reaperTS > 30000) {
          await this.reap()
          reaperTS = Date.now()
          this.status()
        }
      }

      // Handle incoming requests: find, register, unregister
      /** @type BNSMessage */
      let msg = ph.read()
      // await this.debug("<: %j", msg)
      switch (msg.cmd) {
        case "BNS.find":
          // <411 find $replyport $id $methodname
          await this.find(msg)
          break;
        case "BNS.register":
          // <411 register $replyport $id {RPCServer}
          await this.register(msg)
          break;
        case "BNS.unregister":
          // <411 unregister $replyport $id {RPCServer}
          await this.unregister(msg)
          break;
        case "quit":
          await this.log("Quitting")
          return
        default:
          this.log("Unknown command %j %j", cmd, args)
          break;
      }
    }
  }

  // Go through the LRU, kill all servers that are idle for more than the timeout.
  async reap() {
    let now = Date.now()
    let dead = []
    let evict = []
    for (let i of this._lru) {
      let srv = this._servers.get(i.method)
      if (srv == undefined || !this.isRunning(srv.pid)) {
        dead.push(i.method)
        continue
      }
      if (srv.host == "home") evict.push(srv.method)
      if (now - i.ts < this.timeout) continue
      this.log("Shutting down %s at %s:%d, timeout", srv.method, srv.host, srv.port)
      this.quit(srv)
      dead.push(i.method)
    }

    this._lru = this._lru.filter((i) => !dead.includes(i.method))
    dead.forEach((d) => this._servers.delete(d))
    // Any servers that are running at home, see if we can find a different
    // host for them.
    evict.forEach(
      (e) => this._startRPCServer(e, true)
    )
  }

  /**
   * @param {RPCServer} srv
   **/
  async quit(srv) {
    await this._send(srv.port, "quit", "/quitquitquit", 0)
  }

  /**
   * @param {BNSMessage} msg
   **/
  async find(msg) {
    // this._ns.printf("find(%j)", msg)

    // If we have a live server, use it. Otherwise, start one.
    let method = msg?.payload?.method
    let srv = this._servers.get(method)
    if (srv != undefined && this.isRunning(srv.pid)) {
      // this.debug("Found %s on %s:%d", method, srv.host, srv.port)
    } else {
      do {
        await this.asleep(1)
      } while (await this._startRPCServer(method) == 0)
      srv = this._servers.get(method)
    }

    await this._send(msg.replyTo, "BNS.find", srv, msg.id)

    // Update LRU.
    this._lru = this._lru.filter((i) => i.method != method)
    this._lru.push({method: method, ts: Date.now()})
  }

  /** @param {BNSMessage} msg */
  async register(msg) {
    /** @type {RPCServer} */
    let srv = msg.payload
    let method = srv.method
    if (this._servers.has(method)) {
      let prev = this._servers.get(method)
      if (prev.port != srv.port || prev.host != srv.host) {
        if (prev.host != "home") {
          this.debug("Not replacing %s on %s:%d (%d)", method, prev.host, prev.port, prev.pid)
          this._send(msg.replyTo, "BNS.register", {status: "NOK"}, msg.id)
          return
        }
        await this.log("Re-registering %s: %d@%s -> %d@%s",
          method, prev.pid, prev.host, srv.pid, srv.host)
        await this.quit(prev)
      }
    } else {
      await this.log("Registered %s: %d@%s", method, srv.pid, srv.host)
    }
    if (!srv.port) {
      srv.port = this.nextPort++
      this.log("Selected port %d for %s", srv.port, srv.method)
    }
    this._servers.set(method, srv)
    this._lru = this._lru.filter((i) => i.method != method)
    this._lru.push({method: method, ts: Date.now()})
    this.write(this.sprintf(this.bnsPath, method), JSON.stringify(srv), "w")
    this._send(msg.replyTo, "BNS.register", {status: "OK", port: srv.port}, msg.id)
  }

  /** @param {BNSMessage} msg */
  async unregister(msg) {
    /** @type {RPCServer} */
    let srv = msg.payload
    let method = srv.method
    if (this._servers.has(method)) {
      let rec = this._servers.get(method)
      if (rec.pid == srv.pid) {
        this._servers.delete(method)
      } else {
        await this.log("Not deregistering %s (req pid=%d != saved pid=%d)",
          method, srv.pid, rec.pid)
        return
      }
    }
    this.rm(this.sprintf(this.bnsPath, method), "home")
    this._lru = this._lru.filter((i) => i.method != method)
    await this.log("Deregistered %s (%d@%s)", method, srv.pid, srv.host)
  }

  // Internal methods
  serverTemplate = `
    // autogenerated by bns.js on %s
    import { nsRPC } from "/lib/nsRPC.js"

    /** @param {NS} ons */
    export async function main(ons) {
      /** @type {NS} ns */
      let ns = new nsRPC(ons)
      let pn = ons.args[0] || null

      await ns.listen("%s", ons.%s, pn)
    }
  `.replaceAll("    ", "")

  /**
   * @param {string} method - methodName or namespace/methodName
   * @param {boolean} bestEffort - if true, don't kill or wait for space.
   **/
  async _startRPCServer(method, bestEffort=false) {
    this.log("Starting RPC server for %s %s", method, bestEffort ? " (best effort)" : "")
    // If there's a premade RPC server, use that, otherwise, create one from
    // the handy template.
    let fn = this.sprintf(this.serverPath, method)
    if (!this.fileExists(fn, "home"))
      this.log("...Generating server from template")
      this.write(fn, this.sprintf(
        this.serverTemplate,
        new Date().toLocaleString(),
        method,
        method.replaceAll("/", ".")), "w")

    // Get memory requirement.
    let reqMem = this.getScriptRam(fn, "home")
    this.log("...%s required", this.formatRam(reqMem))

    // Select port.
    let port = this.nextPort++
    this.log("...Assigned port %d", port)

    // Find a server that has space.
    let dest = ""
    while (dest == "") {
      await this.asleep(1)
      // Check hosts from most-ram to least, with home being last
      let hosts = Array.from(
        dns(this._ns).values()
      ).filter(
        (h) => h.name != "home" && h.root
      ).sort(
        (a,b) => b.ram - a.ram
      )
      if (!bestEffort) hosts.push(dns(this._ns).get("home"))

      for (let h of hosts) {
        let mem = this.getServerUsedRam(h.name)
        if (h.ram - mem >= reqMem) {
          this.log("...Selected %s, with %s free",
            h.name, this.formatRam(h.ram-mem))
          dest = h.name
          break
        }
      }

      // If our best efforts were not sufficient, give up.
      if (dest == "" && bestEffort) return 0

      // If there isn't one, make space, or keep trying until you do.
      this.debug("...Attempt to free %s", this.formatRam(reqMem))

      let now = Date.now()
      let killed = false
      for (let s of this._lru.filter((e) => now-e.ts > this.lruTimeout)) {
        if (!this._servers.has(s.method)) {
          this.debug("......No entry for a %s server, skipping", s.method)
          continue
        }
        let oomPID = this._servers.get(s.method).pid
        if (!this.isRunning(oomPID)) {
          this.debug("......No %s server MIA, removing from server list", s.method)
          this._servers.delete(s.method)
          continue
        }
        this.log("...Killing %s (%d) so %s can start", s.method, oomPID, method)
        if (!this.kill(oomPID)) continue
        this.log("...Killed %s (%d)", s.method, oomPID)
        killed = true
        break
      }
      if (killed) continue

      // No luck, just have to wait.
      this.debug("No luck, waiting 5s")
      await this.asleep(5000)
    }

    // Copy the code over.
    this.scp(["log.js", "lib/nsRPC.js", fn], dest, "home")

    // Start the server.
    let pid = this.exec(fn, dest, 1, port)
    if (pid > 0) {
      this.log("Started RPC server for %s on %s:%d (pid=%d)", method, dest, port, pid)
      this._servers.set(method, {pid: pid, host: dest, port: port, method: method})
      return pid
    }
    this.log("Failed to start RPC server for %s on %s:%d", method, dest, port)
    return 0
  }

  /**
   * @param {number} port
   * @param {string} method
   * @param {any} payload
   * @param {number} id
   */
  async _send(port, method, payload=null, id) {
    let ph = this.getPortHandle(port)
    if (ph.full()) {
      this.warning("Port %d full, dropping payload %j", port, payload)
    }
    // await this.debug(">%d(%s): %j", port, method, payload)
    ph.write({cmd: method, id: id, payload: payload})
  }

  _loadServers() {
    let now = Date.now()
    for (let f of this.ls("home", "data/bns")) {
      /* @type {RPCServer} */
      this.debug("Reading BNS: %s", f)
      let srv = JSON.parse(this.read(f))
      let valid = true
      if (!srv.pid) valid = false
      if (valid && !this.isRunning(srv.pid, srv.host)) valid = false
      if (!valid) {
        this.log("Removing old BNS entry for %s", srv.method)
        this.rm(f, "home")
        continue
      }

      this._servers.set(srv.method, srv)
      this.log("Found server for %s on port %d", srv.method, srv.port)
      this.nextPort = Math.max(this.nextPort, srv.port+1)
      this._lru.push({method: srv.method, ts: now})
    }
  }

}
