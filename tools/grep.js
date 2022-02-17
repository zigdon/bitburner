/** @param {NS} ns **/
export async function main(ns) {
    var re = new RegExp(ns.args[0], 'g');
    re = new RegExp(/install/, 'g');
    for (var f of ns.args.slice(1)) {
        ns.tprintf("Looking at %s", f);
        var data = ns.read(f).split("\n"); // .filter(l => l.match(re));
        ns.tprintf("%d matches", data.length);
        // data.forEach(l => ns.tprintf("%s: %s", f, l));
    }
}