import {warning, critical} from "@/log.js"

/*
 * Can be used instead of ns. For supported methods, it'll send the request
 * over the network and return the reply. Otherwise, it'll just proxy the call
 * to ns.
 */
export class nsRPC {
  _offset = 1e10
  _bnsPort = 411
  _counter = 0

  /** @type {NS} _ns */
  _ns

  // Function namespace, look up ports with "$namespace_" prefix
  /** @type {string} _namespace */
  _namespace

  _server = false

  _nsSupport = [
    'bladeburner',
    'codingcontract',
    'corporation',
    'singularity'
  ]

  _notLogged = [
    "corporation/getCorporation",
    "getGeneralActionNames",
    "getContractNames",
    "getOperationNames",
    "getBlackOpNames",
  ]

  _notHandled = [
    "bladeburner/getGeneralActionNames",
    "bladeburner/getContractNames",
    "bladeburner/getOperationNames",
    "bladeburner/getBlackOpNames",
    "codingcontract/getContract",  // Can't clone a contract
    "singularity/installBackdoor",
  ]

  _bnsCache = new Map()

  /**
   * @param {NS} ns
   * @param {string} namespace
   * @returns NS
   **/
  constructor(ns, namespace) {
    // ns.print("init ", namespace)
    ns.disableLog("disableLog")
    ns.disableLog("asleep")
    this._ns = ns;
    this._namespace = namespace ?? ""

    this.bns = null

    return new Proxy(this, {
      get(target, prop) {
        const maybeLog = (prop, tmpl, ...args) => {
          if (!target._notLogged.includes(prop))
            target._log(target._ns.sprintf(tmpl, ...args))
        }

        // Anything starting with _ is never handled by ns
        if (prop[0] == "_") {
          return target[prop]
        }

        // If the property exists in our class (like our custom methods), use it
        if (prop in target) {
          maybeLog(prop, "Overriding %s", prop)
          return target[prop];
        }

        // If it's a known namespace, return a new proxy for that namespace
        if (target._nsSupport.includes(prop) && prop != target._namespace) {
          return new nsRPC(target._ns, prop)
        }

        // If it's one of the namespaces we handle, handle it.
        if (target._namespace != "" &&
          !target._notHandled.includes(target._namespace+"/"+prop)) {
          // maybeLog(prop, "Handling %s in %s", prop, target._namespace)
          return target._mkMethod(target._namespace+"/"+prop)
        }

        // Otherwise, redirect the call to the game's 'ns' object
        let val = target._ns[prop];
        if (target._namespace != "") {
          maybeLog(prop, "Passing through %s in %s", prop, target._namespace)
          val = target._ns[target._namespace][prop];
        }
        if (typeof val === 'function') return val.bind(target._ns);
        return val;
      }
    });
  }

  async _error(tmpl, ...args) {
    await warning(this._ns, tmpl, ...args)
  }

  _setTitle(tmpl, ...args) {
    let name = this._ns.getScriptName()
    tmpl = name + " - " + tmpl
    this._ns.ui.setTailTitle(this._ns.sprintf(tmpl, ...args))
  }

  _binlog(tmpl, ...args) {
    let logName = this._ns.getScriptName()
    let now = new Date()
    let date = this._ns.sprintf("%02d%02d", now.getDate(), now.getHours())
    logName = logName.slice(logName.lastIndexOf("/")+1).split(".")[0]
    if (this._server) {
      logName = this._ns.sprintf("%s.%s.%d.txt",
        this._namespace || "core", logName, this._ns.pid)
    } else {
      logName = this._ns.sprintf("%s.%d.txt", logName, this._ns.pid)
    }
    let line = this._ns.sprintf(tmpl, ...args) + "\n"
    this._ns.write("/logs/rpc/"+date+"/"+logName, line)
  }

  _log(tmpl, ...args) {
    let now = new Date()
    let ts = now.toLocaleTimeString()
    tmpl = ts + ": " + tmpl
    this._ns.print(this._ns.sprintf(tmpl, ...args))
    this._binlog(tmpl, ...args)
  }

  /**
   * @param {?number} id
   * @param {?string} method
   * @param {?number} port
   * @returns {any}
   */
  async bnsRead(id=0, method=undefined, port=undefined) {
    let host = this._ns.read("hosts.txt")
    port ??= this._ns.pid + this._offset
    let ph = this._ns.getPortHandle(port)
    if (ph.peek() == "NULL PORT DATA") await ph.nextWrite()

    let msg = ph.read()
    if (method != undefined && msg.method != method) {
      await critical(this._ns,
        "bns message method mismatch, aborting %s@%s: %j",
        this._ns.getScriptName(), host, msg)
      this._ns.exit()
    }
    id ||= this._counter
    if (msg.id != this._counter-1) {
      await critical(this._ns,
        "bns message ID mismatch want %d, got %d, aborting %s@%s: %j",
        this._counter, msg.id, this._ns.getScriptName(), host, msg)
      this._ns.exit()
    }

    this._log("bnsRead: %j", msg)
    return msg.payload
  }

  async bnsRegister(method) {
    // Send a register BNSMessage to BNS, ask for a port
    // If we got one, start listening on it
    let host = this._ns.read("hosts.txt")
    let msg = await this._sendRPC("BNS.register",
      {method: method, pid: this._ns.pid, host: host}, this._bnsPort)

    if (msg.status == "NOK") {
      await warning(this._ns, "Registration rejected: %s@%s, aborting",
        this._ns.getScriptName(), host)
      return 0
    }

    this.bns = {method: method, pid: this._ns.pid, host: host, port: msg.port}
    this._log("Registered %s on %s: %j", this.bns.method, this.bns.host, this.bns)

    return msg.port
  }

  async bnsUnregister() {
    if (!this.bns) return
    // Send an unregister BNSMessage to BNS
    let msg = await this._sendRPC("BNS.unregister", this.bns, this._bnsPort)
    this._log("Unregister reply: %j", msg)
  }

  /**
   * @param {string} method
   * @param {function(any) any} callback
   * @param {?number} pn
   */
  async listen(method, callback, pn=null) {
    // Ignore any quit messages at startup
    let startup = true
    this._server = true

    // Register with BNS, and ask for a port if we don't have one.
    let host = this._ns.read("hosts.txt")
    let srv = {method: method, pid: this._ns.pid, host: host}
    if (pn != null) srv.port = pn
    let reg = await this._sendRPC("BNS.register", srv, this._bnsPort)
    if (reg.status == "NOK") {
      this._log("Registration rejected: %j", reg)
      return
    }
    srv.port = reg.port
    this._log("Registered on port %d: %j", reg.port, srv)

    let ph = this._ns.getPortHandle(srv.port)
    this._log("Handling %s calls on port %j", method, srv.port)
    while (true) {
      this._setTitle("... %d ?", srv.port)
      await this._ns.asleep(1)
      let msg = ph.read()
      if (msg == "NULL PORT DATA") {
        startup = false
        await ph.nextWrite()
        continue
      }
      this._setTitle("... %d <", srv.port)
      this._log("<%j", msg)
      if (msg.payload == "/quitquitquit") {
        if (startup) {
          this._log("Ignoring quit command on startup")
          continue
        }
        this._log("Quitting...")
        await this.bnsUnregister()
        return
      }
      if (msg.cmd != method) {
        this._error("Ignoring misdirected call (got %j, want %j)", msg.cmd, method)
        await this._send(msg.replyTo, "ERR.retry", msg, msg.id)
        continue
      }

      let res = null
      try {
        res = await callback(...msg.payload)
      } catch (e) {
        this._log("Caught error in callback: %j", e)
        this._error("Error in %s (%d) callback",
          this._ns.getScriptName(), this._ns.pid)
      }
      this._setTitle("... %d >", srv.port)
      this._log(">%j", res)
      await this._send(msg.replyTo, method, res, msg.id)
    }
  }

  /**
   * @param {string} method
   */
  _mkMethod(method) {
    return async function(...args) {
      return await this._sendRPC(method, args)
    }
  }

  /**
   * @param {string} method
   */
  async _getPort(method) {
    if (this._bnsCache.has(method)) {
      let srv = this._bnsCache.get(method)
      if (this._ns.isRunning(srv.pid, srv.host)) {
        return srv.port
      }
      this._log("Removing stale BNS cache: %j", srv)
    }
    let srv = await this._sendRPC("BNS.find", {method: method}, this._bnsPort)
    this._bnsCache.set(method, srv)
    this._log("Caching BNS result for %s: %j. Cache size: %d", method, srv, this._bnsCache.size)
    return srv.port
  }

  /**
   * @param {string} method
   * @param {any} args
   * @param {?number} port
   * @returns any */
  async _sendRPC(method, args, port=0) {
    this._setTitle("... ? %s:%d", method, port)
    port ||= await this._getPort(method)
    this._setTitle("... > %s:%d", method, port)
    let mid = await this._send(port, method, args)
    this._setTitle("... < %s:%d", method, port)
    return await this._getReply(method, mid)
  }

  /**
   * @param {string} method
   * @param {int} mid
   * @returns any
   */
  async _getReply(method, mid) {
    let pn = this._offset+this._ns.pid
    let ph = this._ns.getPortHandle(pn)
    let start = Date.now()
    while (true) {
      await this._ns.asleep(1)

      if (Date.now() - start > 60000) {
        this._log("TIMEOUT waiting for a reply from %s on %d, retrying", method, mid)
        return await this._sendRPC(msg.payload.cmd, msg.payload.payload)
      }

      let msg = ph.peek()
      if (msg == "NULL PORT DATA") {
        await this._ns.asleep(10)
        continue
      }
      if (msg.id != mid) {
        continue
      }
      if (msg.cmd == "ERR.retry") {
        this._log("Retrying... %j", msg.payload)
        return await this._sendRPC(msg.payload.cmd, msg.payload.payload)
      }
      if (msg.cmd != method) {
        continue
      }

      ph.read()
      this._binlog("<%s(%j)", method, msg.payload)
      return msg.payload
    }
  }

  /**
   * @param {number} port
   * @param {string} method
   * @param {any} payload
   * @param {?number} id
   * @returns string
   */
  async _send(port, method, payload, id=null) {
    let pid = this._ns.pid
    let ph = this._ns.getPortHandle(port)
    let c = id || this._counter++
    let replyTo = this._offset+pid
    while (!ph.tryWrite({
      cmd: method, "replyTo": replyTo, id: c, payload: payload
    })) {
      this._log("Waiting for %s port", method)
      await this._ns.asleep(1)
    }
    this._binlog(">%s(%j)", method, payload)

    return c
  }
}
