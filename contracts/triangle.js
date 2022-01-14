/** @param {NS} ns **/
export async function main(ns) {
    var tri = [
                [4],
        [7,7],
       [5,9,9],
      [4,3,1,6],
     [1,6,4,9,6],
    [5,1,2,3,8,2],
   [5,7,1,1,7,7,8],
  [2,5,2,6,1,5,3,6]  ];

    var path = [];
    var max = 0;
    for (var l = 0; l < tri.length; l++) {
        path.push(0);
    }

    while (true) {
        var l = tri.length - 1;
        var sum = add(ns, tri, path);
        if (sum < max || max == 0) {
            max = sum;
        }
        path = next(ns, tri, path);
        if (!path) {
            break
        }
    }

    ns.tprint(max);
}

function next(ns, data, path) {
    var i = data.length - 1;
    // Walk up the path that went to the right
    while (i > 0 && path[i] == path[i - 1] + 1) {
        i--
    }
    // If we're at the top, we're done
    if (i == 0) {
        return false;
    }

    // move to the right
    var change = false;
    if (path[i] == path[i - 1]) {
        change = true;
        path[i]++
    }
    // Everything below this point goes left
    if (!change) {
        return false;
    }
    for (var j = i + 1; j < data.length; j++) {
        path[j] = path[j - 1];
    }
    return path;
}

function add(ns, data, path) {
    var res = 0;
    for (var i = 0; i < data.length; i++) {
        res += 1*data[i][path[i]];
    }
    return res
}