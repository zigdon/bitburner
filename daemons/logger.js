/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var date = new Date().toLocaleTimeString("en-US", { timeZone: "PST" });
    await log(ns, "", date + " - logger starting up...");
    while(true) {
        var line = ns.readPort(5);
        if (line.startsWith("NULL PORT DATA")) {
            await ns.sleep(1000);
        } else {
            var host;
            if (line.indexOf("{") > 0) {
                host = line.substring(line.indexOf("{")+1, line.indexOf("}"));
            }
            line = line.replace(/<.*\//, "<");
            await log(ns, host, line);
            await ns.sleep(100);
        }
    }
}

async function log(ns, host, line) {
    ns.print(line);
    if (host) {
        await ns.write("/log/"+host+".txt", line+"\n", "a");
    } else {
        await ns.write("/log/log.txt", line+"\n", "a");
    }
}