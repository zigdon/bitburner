/*
 * Can be used instead of ns. For supported methods, it'll send the request
 * over the network and return the reply. Otherwise, it'll just proxy the call
 * to ns.
 */
export class dn {
  _offset = 1e10
  _counter = 0

  /** @type {NS} _ns */
  _ns
  /** @type {Map<string, int} */
  _ports = new Map([
    "bladeburner_getRank",
    "corporation_getCorporation",
    "corporation_getDivision",
    "corporation_getHireAdVertCost",
    "corporation_getOfficeSizeUpgradeCost",
    "corporation_getProduct",
    "corporation_getResearchCost",
    "corporation_getUpgradeLevelCost",
    "corporation_getUpgradeWarehouseCost",
    "corporation_hasCorporation",
    "corporation_hasResearched",
    "corporation_hasUnlock",
    "corporation_hasWarehouse",
    "singularity_getAugmentationFactions",
    "singularity_getAugmentationPrereq",
    "singularity_getAugmentationPrice",
    "singularity_getAugmentationRepReq",
    "singularity_getAugmentationStats",
    "singularity_getAugmentationsFromFaction",
    "singularity_getFactionEnemies",
    "singularity_getFactionFavor",
    "singularity_getFactionInviteRequirements",
    "singularity_getFactionRep",
    "singularity_getFactionWorkTypes",
    "singularity_getOwnedAugmentations",
    "singularity_getOwnedSourceFiles",
    "singularity_purchaseAugmentation",
  ].map((m, i) => [m, this._offset+i]))

  // Function namespace, look up ports with "$namespace_" prefix
  _namespace

  _nsSupport = [
    'corporation',
    'singularity'
  ]

  _notLogged = [
    "asleep",
    "formatNumber",
    "formatRam",
    "getPlayer",
    "getPortHandle",
    "getScriptName",
    "print",
    "printf",
    "read",
    "sprintf",
    "tprint",
    "tprintf",
    "writePort",
  ]

  /**
   * @param {NS} ns
   * @param {string} namespace
   * @returns NS
   **/
  constructor(ns, namespace) {
    ns.print("init ", namespace)
    ns.disableLog("asleep")
    this._ns = ns;
    this._namespace = namespace ?? ""


    return new Proxy(this, {
      get(target, prop) {
        const maybeLog = (prop, tmpl, ...args) => {
          if (!target._notLogged.includes(prop)) target._log(target._ns.sprintf(tmpl, ...args))
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
          return new dn(target._ns, prop)
        }

        // If we have it in our config, create a handler for it
        if (target._namespace == "" && target._ports.has(prop)) {
          maybeLog(prop, "Handling %s", prop)
          return target._mkMethod(prop)
        } else if (target._ports.has(target._namespace+"_"+prop)) {
          maybeLog(prop, "Handling %s in %s", prop, target._namespace)
          return target._mkMethod(target._namespace+"_"+prop)
        } else {
          maybeLog(prop, "Not handled: %s", target._namespace+"_"+prop)
        }

        // Otherwise, redirect the call to the game's 'ns' object
        let val = target._ns[prop];
        if (target._namespace == "") {
          maybeLog(prop, "Passing through %s", prop)
        } else {
          maybeLog(prop, "Passing through %s in %s", prop, target._namespace)
          val = target._ns[target._namespace][prop];
        }
        if (typeof val === 'function') return val.bind(target._ns);
        return val;
      }
    });
  }

  _log(tmpl, ...args) {
    this._ns.printf(tmpl, ...args)
  }

  /**
   * @param {string} method
   * @param {function(any) any} callback
   */
  async listen(method, callback) {
    if (!this._ports.has(method)) {
      this._log("Can't set up listener for unknown method %j in %j",
        method, this._ns.getScriptName())
      return
    }
    let pn = this._ports.get(method)
    let ph = this._ns.getPortHandle(pn)
    this._log("Handling %s calls on port %d", method, pn)
    while (true) {
      await this._ns.asleep(1)
      let msg = ph.read()
      if (msg == "NULL PORT DATA") {
        await this._ns.nextPortWrite(pn);
        continue
      }
      this._log("<%s: %j", msg)
      let [pid, c, req, args] = msg
      if (req != method) {
        this._log("Ignoring misdirected call (got %j, want %j)", req, method)
        continue
      }

      let res = await callback(...args)
      let resPN = this._offset+pid
      let resPort = this._ns.getPortHandle(resPN)
      while (!resPort.tryWrite([pid, c, method, res])) {
        this._log("Waiting for %s reply port %d", method, resPN)
        await this._ns.asleep(1)
      }
      this._log(">%d: %s(%j)", pn, method, args)
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
   * @param {any} args
   * @returns any */
  async _sendRPC(method, args) {
    if (!this._ports.has(method)) {
      this._log("Can't send to unknown method %j in %j",
        method, this._ns.getScriptName())
      return
    }
    let mid = await this._send(this._ns.pid, this._ports.get(method), method, args)
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
    let last = ""
    let start = Date.now()
    while (true) {
      await this._ns.asleep(1)

      if (Date.now() - start > 60000) {
        this._log("TIMEOUT waiting for a reply from %s on %d", method, mid)
        return
      }

      let data = ph.peek()
      if (data != last) {
        // this._log("<%d: %j", pn, data)
        last = data
      }
      if (data == "NULL PORT DATA") {
        await this._ns.nextPortWrite(pn);
        continue
      }
      // [pid, mid, method, res]
      if (data[0] != this._ns.pid) {
        continue
      }
      if (data[1] != mid) {
        continue
      }
      if (data[2] != method) {
        continue
      }

      // this._log("Got reply on %d: %j", pn, data[3])
      ph.read()
      return data[3]
    }
  }

  /**
   * @param {int} pid
   * @param {int} port
   * @param {string} method
   * @param {any} args
   * @returns string
   */
  async _send(pid, port, method, args) {
    let ph = this._ns.getPortHandle(port)
    let c = this._counter++
    while (!ph.tryWrite([pid, c, method, args])) {
      this._log("Waiting for %s port", method)
      await this._ns.asleep(1)
    }
    this._log(">%d: %s(%j)", port, method, args)

    return c
  }
}

