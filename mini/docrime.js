/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    while (!ns.gang.createGang("Slum Snakes")) {
        ns.tail();
        ns.commitCrime("Homicide");
        while (ns.isBusy()) {
            await ns.sleep(100);
        }
        ns.print(`${ns.heart.break()} karma, ${ns.getPlayer().numPeopleKilled} kills`);
    }
}