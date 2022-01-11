/** @param {NS} ns **/
export async function main(ns) {
    var i=0;
    while (i<10) {
        i++;
        var start = Date.now();
        await ns.sleep(i*1000);
        var delta = Date.now() - start;
        ns.tprintf("Tried to sleep for %ds, actual was %.2fs", i, delta/1000);
    }

}