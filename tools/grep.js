/** @param {NS} ns **/
export async function main(ns) {
    let re = new RegExp(ns.args[0], 'g');
    for (let glob of ns.args.slice(1)) {
        for (let f of ns.ls("home", glob)) {
            let data = ns.read(f).split("\n").filter(l => l.match(re));
            if (data.length == 0) { continue }
            data.forEach(l => ns.tprintf("%s: %s", f, l));
        }
    }
}