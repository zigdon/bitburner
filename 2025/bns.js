import {info} from "@/log.js"
import {singleInstance} from "@/lib/util.js"

/*
 * @param {NS} ns
 */
export async function main(ns) {
  if (!singleInstance(ns)) return
}

/**
 * @interface RPCServer
 * @property {number} pid - PID of the server.
 * @property {string} host - where the server is running.
 * @property {string} method - namespace.method served.
 * @property {number} port - port listened on
 */

class BNS {
  /** @type {NS} _ns */
  _ns

  /** @type {Map<string, RPCServer} */
  _servers = new Map()

  path = "bns/%s.json"
  serverPath = "lib/rpc/%s"
  basePort = 1e6

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
  //
  // <411 register {RPCServer}
  // >OK
  // <411 unregister {RPCServer}
  // >OK

  /** @param {NS} ns */
  constructor(ns) {
    this._port = 411
    this._ns = ns

    this._loadServers()
  }

  _loadServers() {
    for (let f of this.ls("home", "bns")) {
      /* @type {RPCServer} */
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
    }
  }

  // Some sugar
  asleep = this._ns.asleep
  fileExists = this._ns.fileExists
  getScriptRam = this._ns.getScriptRam
  isRunning = this._ns.isRunning
  ls = this._ns.ls
  read = this._ns.read
  rm = this._ns.rm
  sprintf = this._ns.sprintf
  write = this._ns.write

  // BNS methods
  async listen() {}

  /** @param {string} tmpl
   * @param {any[]} args
   */
  async log(tmpl, ...args) {
    await info(this._ns, tmpl, ...args)
  }

  /** @param {RPCServer} srv */
  async register(srv) {
    if (this._servers.has(srv.method)) {
      let prev = this._servers.get(srv.method)
      await this.log("Registering %s: %d@%s -> %d@%s",
        srv.method, prev.pid, prev.host, srv.pid, srv.host)
      this._kill(this._servers.get(srv.method))
    } else {
      await this.log("Registered %s: %d@%s", srv.method, srv.pid, srv.host)
    }
    this._servers.set(srv.method, srv)
    this.write(this.sprintf(this.path, srv.method), JSON.stringify(srv))
  }

  async unregister(srv) {
    if (this._servers.has(srv.method)) {
      let rec = this._servers.get(srv.method)
      if (rec.pid == srv.pid) {
        this._servers.delete(srv.method)
      } else {
        await this.log("Not deregistering %s (req pid=%d != saved pid=%d)",
          srv.method, srv.pid, rec.pid)
        return
      }
    }
    this.rm(this.sprintf(this.path, srv.method), "home")
    await this.log("Deregistered %s (%d@%s)", srv.method, srv.pid, srv.host)
  }

  serverTemplate = `
    import { nsRPC } from "/lib/nsRPC.js"

    /** @param {NS} ons */
    export async function main(ons) {
      /** @type {NS} ns */
      let ns = new nsRPC(ons)

      await ns.listen("%s", ons.%s)
    }
  `.replaceAll("    ", "")

  /** @param {string} method - methodName or namespace/methodName */
  async startRPC(method) {
    // If there's a premade RPC server, use that, otherwise, create one from
    // the handy template.
    let fn = this.sprintf(this.serverPath, method)
    if (!this.fileExists(fn, "home")) {
      this.write(
        fn,
        this.sprintf(this.serverTemplate, method.replaceAll("/", ".")),
        "w")
    }

    // Get memory requirement.
    let mem = this.getScriptRam(fn, "home")

    // Select port.
    let usedPorts = Array.from(this._servers.values()).map((s) => s.port)
    let port = this.basePort
    while (usedPorts.includes(port)) {
      await this.asleep(1)
      port++
    }

    // Find a server that has space.
    let dest = ""
    while (dest == "") {
      await this.asleep(1)
      let hosts = Array.from(
        dns(this.ns).values()
      ).sort(
        (a,b) => (b.ram-b.used) - (a.ram-a.used)
      )

      // If there isn't one, make space, or keep trying until you do.
    }
    // Copy the code over.
    // Start the server.
  }
}
