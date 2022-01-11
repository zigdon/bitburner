/** @param {NS} ns **/
export async function main(ns) {
    var num = ns.args[0];
    var sqrt = Math.sqrt(num);
    var i = 2;
    while (true) {
        if (num % i == 0) {
            num /= i;
            ns.tprintf(" / %d = %d", i, num);
            continue
        }

        i++;
        if (i > sqrt) {
            break
        }
    }

    ns.tprintf("done, n=%d", num);

}