/**
 * @param {NS} ns
 * @param {string} host
 * @param {string} file
 * @param {string} type
 * 
 **/
export async function proxyReqData(ns, host, file, type) {
    // < pid host file {get type | answer}
    var pid = ns.getRunningScript().pid;
    var msg = ns.sprintf("< %d %s %s get %s", pid, host, file, type);
    ns.print("Sending request: ", msg);
    while (!await ns.tryWritePort(9, msg)) {
        ns.print("Waiting to send to contract proxy");
        await ns.sleep(500);
    }
    ns.print("Waiting for contract proxy reply");
    var start = Date.now();
    while (Date.now() - start < 20) {
        // > timestamp pid data
        var head = ns.peek(9);
        var words = head.split(" ");
        if (words[2] != pid) {
            await ns.sleep(500);
        }
        head = ns.readPort(9);
        ns.print("got: ", head);
        return JSON.parse(words.splice(3));
    }

    ns.print("Timeout waiting for contract proxy");
    return;
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {string} file
 * @param {any} answer
 * 
 **/
export async function proxyPostAnswer(ns, host, file, answer) {
    var pid = ns.getRunningScript().pid;
    var msg = ns.sprintf("< %d %s %s answer %s", pid, host, file, answer);
    ns.print("Sending answer: ", msg);
    while (!await ns.tryWritePort(9, JSON.stringify(msg))) {
        ns.print("Waiting to send to contract proxy");
        await ns.sleep(500);
    }
    ns.print("Waiting for contract proxy reply");
    var start = Date.now();
    while (Date.now() - start < 20) {
        // > timestamp pid data
        var head = ns.peek(9);
        var words = head.split(" ");
        if (words[2] != pid) {
            await ns.sleep(500);
        }
        head = ns.readPort(9);
        ns.print("got: ", head);
        return words.splice(3).join(" ");
    }

    ns.print("Timeout waiting for contract proxy");
    return;
}