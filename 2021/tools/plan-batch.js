import * as fmt from "/lib/fmt.js";
import { settings } from "/lib/state.js";
import { console } from "/lib/log.js";
import { printPlans, planBatch } from "/lib/hack.js";
import * as hive from "/lib/hive.js";

/*
/ A batch has 4 actions, that END in the follow order:
/ 1. hack
/ 2. weaken
/ 3. grow
/ 4. weaken
/ 
/ These should all be STARTED when the server security is at a minimum.
/ Between each step ending, aim for 20-200ms.
/
/ Our plan, calculate backwards when should each step start. Then keep track
/ of when in the timeline it's appropriate to launch jobs. When trying to
/ schedule a new batch, make sure all the starting points are appropriate,
/ or wait as appropriate to ensure they do.
/
/ Additionally, keep track of the delta between when we wanted to start an
/ action to when it actually starts. Adjust our delay as needed.
/
/ When designing a batch, take the input of how much memory to spend. Figure
/ out how many threads we can use per batch. The output should be a schedule
/ that could be broken apart and run on individual servers.
*/

let st;

/** @param {NS} ns **/
export async function main(ns) {
    st = settings(ns, "batch")
    ns.clearLog();
    if (ns.args.length < 3) {
        ns.tprintf("Invalid usage! Args are: memory cores target");
        return;
    }
    let memStr = ns.args.shift();
    let mem = fmt.parseMem(memStr);
    if (isNaN(mem)) { ns.tprintf("Invalid memory %s", memStr); ns.exit(); }
    let cores = ns.args.shift();
    let target = ns.args.shift();
    await console(ns, "Calculating batches to hack %s with %s and %d cores", target, fmt.memory(mem), cores);
    ns.clearLog();
    ns.disableLog("ALL");

    // Get to min sec/max val
    await console(ns, "Getting to minsec/maxval")
    if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
        if (!await hive.swarmSingle(ns, "weaken", target)) {
            await console(ns, "Failed to weaken, aborting!");
            return;
        }
        let w = ns.getWeakenTime(target);
        await console(ns, "Waiting %s for weaken", fmt.time(w))
        await ns.sleep(w);
    }

    if (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
        let t = ns.growthAnalyze(target, ns.getServerMaxMoney(target)/ns.getServerMoneyAvailable(target), cores);
        if (!await hive.swarmSingle(ns, "grow", target)) {
            await console(ns, "Failed to weaken, aborting!");
            return;
        }
        let weakenStart = Date.now() + ns.getGrowTime(target) - ns.getWeakenTime(target) + st.read("batchGap");
        let dmg = ns.growthAnalyzeSecurity(t);
        let w = 1;
        while (ns.weakenAnalyze(w) < dmg) {
            w++;
        }

        let batch = await hive.schedule(ns, "weaken", target, w, null, weakenStart);
        if (!batch) {
            await console(ns, "Failed to schedule weaken, aborting!");
            return;
        }
        let endTime = weakenStart + ns.getWeakenTime(target);
        await console(ns, "Waiting for %s for grow/weaken to finish (batchID: %s)",
            fmt.time(endTime-Date.now()), batch.batchID);
        while (Date.now() < endTime) {
            await ns.sleep(1000);
        }
    }
    
    let plans = await planBatch(ns, st.read("batchGap"), mem, cores, target);
    if (plans.filter(b => b).length == 0) {
        await console(ns, "No batch options found!");
        return;
    }
    await console(ns, printPlans(plans));

    let plan = plans[0];
    ns.print(JSON.stringify(plan, null, 2));
    let fname = `/json/${target}/${mem}-${cores}.json.txt`;
    ns.tprintf("Saving JSON to %s", fname);
    await ns.write(fname, JSON.stringify(plan, null, 2), "w");
    ns.exec("/tools/verify-batch.js", "home", 1, fname);
}