/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var data = ns.args[0];
    // (a)()a(())))a)()
    // ())((()a()(()()(aa((
    // (aa))a)a)((())((a(((

    ns.tprintf("starting parens: %s -> [%d, %d, %d]", data, ...count(data));
    var res = makeValid(data);
    ns.tprint("========");
    res.forEach((r) => {ns.tprint(r)});
    ns.tprintf("[%s]", res.join(","));
}

/**
 * @param {string} data
 * @returns {number}
 */
function count(data) {
    var cnt = 0;
    var min = 0;
    var max = 0;
    for (var i=0; i<data.length; i++) {
        var c = data[i];
        if (c == "(") {
            cnt++;
        } else if (c == ")") {
            cnt--;
        }
        if (cnt > max) { max = cnt }
        if (cnt < min) { min = cnt }
    }

    return [cnt, min, max];
}

/**
 * @param {string} data
 * @param {number} best
 * @returns {string[]}
 */
export function makeValid(data, best) {
    data = trim(data);
    if (best && data.length < best) {
        return [];
    }
    var [cnt, min, max] = count(data);
    // console.log(sprintf("count: %s -> [%d, %d, %d], best = %d", data, cnt, min, max, best));
    if (cnt == 0) {
        // console.log(sprintf("%s valid", data));
        return [data];
    }

    var res = [];
    var subRes = new Map()
    for (var i=0; i<data.length; i++) {
        [cnt, min, max] = count(data);
        // console.log(sprintf("data: %s, [%d, %d]", data, min, max));
        if ("()".indexOf(data[i]) == -1) {
            continue;
        } else if (cnt > 0 && data[i] == ")") {
            if (min >= 0) {
                continue;
            }
            min++;
            // console.log(sprintf("removing ) (%d remain) from %s*)*%s at %d", min, data.slice(0, i), data.slice(i+1), i));
        } else if (cnt < 0 && data[i] == "(") {
            if (max <= 0) {
                continue;
            }
            max--;
            // console.log(sprintf("removing ( (%d remain) from %s*(*%s at %d", max, data.slice(0, i), data.slice(i+1), i));
        }
        var fix = data.slice(0,i) + data.slice(i+1);
        fix = trim(fix)

        var sub = makeValid(fix, best);
        sub.forEach((s) => {
            if (!best || s.length > best) {
                best = s.length;
                // console.log("best length: ", best);
            }
            if (s.length == best) {
                subRes.set(s, true);
            }
        })
    }

    subRes.forEach((_, r) => {if (r.length == best) {res.push(r)}});

    return res.filter(invalid);
}

function invalid(data) {
    var cnt = 0;
    for (var i=0; i< data.length; i++) {
        if (data[i] == "(") {
            cnt++;
        } else if (data[i] == ")") {
            if (cnt == 0) {
                return false;
            }
            cnt--;
        }
    }

    return cnt == 0;
}

function trim(data) {
    // strip any leading )
    for (var i=0; i<data.length; i++) {
        if (data[i] == "(") {
            break;
        }
        if (data[i] == ")") {
            data = data.slice(0, i) + data.slice(i+1);
            i--;
        }
    }

    // strip any trailing (
    for (var i=data.length-1; i>=0; i--) {
        if (data[i] == ")") {
            break;
        }
        if (data[i] == "(") {
            data = data.slice(0, i) + data.slice(i+1);
        }
    }

    return data
}
