/** @param {NS} ns **/
export async function main(ns) {
    let cmd = ns.args.shift();
    let target = ns.args.shift();

    const files = [
        "/daemons/share.js",
        "/bin/share.js",
        "/bin/grow.js",
        "/bin/weaken.js",
        "/lib/log.js",
        "/lib/ui.js",
        "/lib/fmt.js",
        "/lib/hack.js",
        "/lib/ports.js",
    ]
    const cmds = {
        "share": "/daemons/share.js",
        "grow": "/bin/grow.js",
        "weaken": "/bin/weaken.js",
        "stop": null,
    }

    if (cmd == "stop") {
        for (let i=0; i < ns.hacknet.numNodes(); i++) {
            let host = `hacknet-node-${i}`
            ns.killall(host);
            for (let f of ns.ls(host)) {
                ns.rm(f, host);
            }
        }
        ns.exit();
    }

    for (let i=0; i < ns.hacknet.numNodes(); i++) {
        let host = `hacknet-node-${i}`
        await ns.scp(files, host);
        let mem = ns.getServerMaxRam(host)
        let threads = cmd == "share" ? 1 : Math.floor(mem / ns.getScriptRam(cmds[cmd]));
        ns.exec(cmds[cmd], host, threads, target || "");
    }
}