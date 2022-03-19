export function autocomplete(data, args) {
    return [...data.txts, ...data.scripts];
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.tail();
    ns.clearLog();
    let fn = ns.args[0];
    let filter = ns.args[1];
    let data = ns.read(fn).split("\n");
    if (filter) {
        data = data.filter(d => d.includes(filter));
    }
    data.forEach(l => ns.print(l));
}