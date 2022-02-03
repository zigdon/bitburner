/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("sleep");
    var data = ns.args[0];
    // (a)()a(())))a)()
    // ())((()a()(()()(aa((

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
 * @param {number} cnt
 * @returns {string[]}
 */
export function makeValid(data) {
    var [cnt, min, max] = count(data);
    if (cnt == 0) {
        return [data];
    }

    data = trim(data);
    [cnt, min, max] = count(data);

    if (cnt == 0) {
        return [data];
    }

    var res = [];
    var subRes = new Map()
    for (var i=0; i<data.length; i++) {
        var newCnt = cnt;
        if ("()".indexOf(data[i]) == -1) {
            continue;
        } else if (cnt > 0 && data[i] == ")") {
            if (min >= 0) {
                continue;
            }
            min++;
        } else if (cnt < 0 && data[i] == "(") {
            if (max <= 0) {
                continue;
            }
            max--;
        }
        if (data[i] == ")") {
            newCnt++;
        } else {
            newCnt--;
        }
        var fix = data.slice(0,i) + data.slice(i+1);
        fix = trim(fix)
        var [nc] = count(fix);
        newCnt = nc;

        if (newCnt == 0) {
            subRes.set(fix, true);
            continue
        }

        var sub = makeValid(fix);
        sub.forEach((s) => {subRes.set(s, true)})
    }

    var best = 0;
    subRes.forEach((_, r) => {if (r.length>best) { best = r.length } });
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