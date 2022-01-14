/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var data = ns.args[0];
    // (a)()a(())))a)()

    var cnt = 0;
    
    for (var i=0; i<data.length; i++) {
        var c = data[i];
        if (c == "(") {
            cnt++;
        } else if (c == ")") {
            cnt--;
        }
    }
    ns.tprint(data, " (", cnt, ")");
    var res = await makeValid(ns, data, cnt, 0);
    ns.tprint("========");
    res.forEach((r) => {ns.tprint(r)});
    ns.tprint(res);
}

var cache = new Map();

/**
 * @param {string} s
 */
async function valid(ns, s) {
    if (s.length < 2) {
        return false;
    }
    if (cache.has(s)) {
        return false;
    }
    await ns.sleep(5);
    cache.set(s, true);

    var p = 0;
    
    for (var i=0; i<s.length; i++) {
        var c = s[i];
        if (c == "(") {
            p++;
        } else if (c == ")") {
            p--;
            if (p < 0) {
                return false;
            }
        }
    }

    return p == 0;
}

var lastPrint = Date.now();
/**
 * @param {NS} ns
 * @param {string} data
 * @param {number} cnt
 * @param {number} best
 * @returns {string[]}
 */
async function makeValid(ns, data, cnt, best) {
    ns.print(data, "  (", cnt, ")");
    if (cnt == 0) {
        return [];
    }
    // strip any leading )
    for (var i=0; i<data.length; i++) {
        if (data[i] == "(") {
            break;
        }
        if (data[i] == ")") {
            var newdata = data.slice(0,i) + data.slice(i+1);
            ns.print("Removing ) from ", data, " -> ", newdata);
            data = newdata;
            i--;
            cnt++;
        }
    }
    // strip any trailing (
    for (var i=data.length-1; i>=0; i--) {
        if (data[i] == ")") {
            break;
        }
        if (data[i] == "(") {
            var newdata = data.slice(0,i) + data.slice(i+1);
            ns.print("Removing ( from ", data, " -> ", newdata);
            data = newdata;
            cnt--;
        }
    }

    /*
    if (Date.now() - lastPrint > 5000) {
        ns.print(data, "  (", cnt, ")");
        lastPrint = Date.now();
    } */

    if (cnt == 0) {
        if (best == 0 || data.length > best) {
            best = data.length;
        }
        return [data];
    }

    await ns.sleep(5);
    var res = [];
    for (var i=0; i<data.length; i++) {
        if (data[i] != "(" && data[i] != ")") {
            i++;
            continue;
        } else if (data[i] == "(") {
            cnt--;
        } else if (data[i] == ")") {
            cnt++;
        }
        var fix = data.slice(0,i) + data.slice(i+1);
        ns.print("Removed ", data[i], " from ", data, " -> ", fix, " (", cnt, ")");

        if (await valid(ns, fix)) {
            if (best == 0 || fix.length > best) {
                best = fix.length;
            } 
            if (fix.length == best) {
                res.push(fix);
            } 
        }

        if (cnt == 0) {
            continue;
        }
        if (fix.length >= best || best == 0) {
            var sub = await makeValid(ns, fix, cnt, best);
            sub.forEach((s) => {res.push(s)})
        }
    }

    return res;
}