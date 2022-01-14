/** @param {NS} ns **/
export async function main(ns) {
    var data = [
[11,49, 7,35,11, 2,27,39,44],
        [13,24,21,27,34,23, 8, 1,43],
        [18, 6,46,18,41,34,39,48,21],
        [ 6,43,20,25, 1,14, 4,11, 5],
        [19,19,16,10,50,10,28,10,24],
        [21,13,38,46,19,47,39,10,41]                    ];

    var w = data[0].length;
    var h = data.length;
    var res = [];
    var top = 0;
    var left = 0;
    var right = w - 1;
    var bottom = h - 1;
    var pos = { x: 0, y: 0 };
    var dir = { x: 1, y: 0 };

    while (true) {
        // ns.tprintf("[(%d,%d) - (%d,%d)]: (%d,%d): %s", left, top, right, bottom, pos.x, pos.y, data[pos.y][pos.x])
        res.push(data[pos.y][pos.x]);
        if (left > pos.x + dir.x ||
            pos.x + dir.x > right ||
            top > pos.y + dir.y ||
            pos.y + dir.y > bottom) {
            if (dir.x == 1 && dir.y == 0) {
                dir = { x: 0, y: 1 };
                top++;
            } else if (dir.x == 0 && dir.y == 1) {
                dir = { x: -1, y: 0 };
                right--;
            } else if (dir.x == -1 && dir.y == 0) {
                dir = { x: 0, y: -1 };
                bottom--;
            } else if (dir.x == 0 && dir.y == -1) {
                dir = { x: 1, y: 0 };
                left++;
            } else {
                ns.tprint(dir);
                ns.exit();
            }
        }

        pos.y += dir.y;
        pos.x += dir.x;

        if (left > right || top > bottom) {
            break;
        }
    }

    ns.tprint(res);
}