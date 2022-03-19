import {getPorts} from "/lib/ports.js";

let state = {};
const d = eval("document");
const ports = getPorts();

/**
 * @param {NS} ns
 * @param {string} id
 * @param {string} label
 * @param {object} opts
 */
export async function newUI(ns, id, label, opts={timeout: 10000}) {
    await ns.writePort(ports.UI, `create ${id} ${label}`);
    await ns.writePort(ports.UI, `timeout ${id} ${opts.timeout}`);
    return {
        update: async t => await ns.writePort(ports.UI, `update ${id} ${t}`),
        remove: async () => await ns.writePort(ports.UI, `remove ${id}`),
    };
}


/**
 * @param {string} id
 **/
export function hideCustomOverview(id) {
    const row = d.getElementById("z"+id);
    if (!row) {
        return;
    }
    row.hidden = true;
    row.style.visibility = "none";
}

/**
 * @param {string} id
 **/
export function restoreCustomOverview(id) {
    const row = d.getElementById("z"+id);
    if (!row) {
        return;
    }
    row.hidden = false;
    row.style.visibility = null;
}

/**
 * @param {string} id
 **/
export function rmCustomOverview(id) {
    let row;
    if (row = d.getElementById("z"+id)) {
        row.remove();
    }
    delete state[id];
}

/**
 * @param {string} id
 * @param {string} name
 **/
export function customOverview(id, name) {
    let shareRow;
    if (!(shareRow = d.getElementById("z"+id))) {
        state[id] = {id: id, label: name};
        const hook = d.getElementById("overview-extra-hook-2");
        const cellCls = hook.className;
        const thCls = hook.parentElement.className;
        const peer = hook.parentElement.parentElement;
        const trCls = peer.className;
        shareRow = d.createElement("tr");
        shareRow.id = "z"+id;
        shareRow.className = trCls;
        shareRow.setAttribute("style", "border-top: white 1px solid;");
        const shareHead = d.createElement("th");
        shareHead.className = thCls;
        const shareLbl = shareRow.insertCell(0)
        shareLbl.className = cellCls;
        shareLbl.innerText = name;
        const shareVal = shareRow.insertCell(1);
        shareVal.className = cellCls;
        shareVal.classList.add("MuiTableCell-alignRight");
        shareVal.id = "z"+id+"Val";
        peer.insertAdjacentElement("afterend", shareRow);
    }

    return shareRow;
}

/**
 * @param {string} id
 * @param {string} val
 **/
export function setCustomOverview(id, val) {
    if (!d.getElementById("z"+id)) {
        if (state[id]) {
            customOverview(id, state[id].label);
        } else {
            return false;
        }
    }
    const cell = d.getElementById("z"+id+"Val");
    val.replaceAll("\n", "<br>");
    cell.innerText = val;
}

/**
 * @param {string} process
 */
export function findLogWindow(process) {
   const divs = d.getElementsByTagName("div");
   for (let i=0; i<divs.length; i++) {
       let d = divs.item(i);
       if (d.classList.contains("react-draggable") && d.innerText.startsWith(process)) {
            console.log(d);
       }
   }
}

/**
 * @param {string} id
 * @param {string} text
 * @param {function} callback
 */
export function addCustomButton(id, text, callback) {
    if (!d.getElementById("z"+id)) {
        if (state[id]) {
            customOverview(id, state[id].label)
        } else {
            return false;
        }
    }
    const cell = d.getElementById("z"+id+"Val");
    const button = d.createElement("button");
    button.className = "MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-textSizeMedium MuiButtonBase-root css-fw8wf6";
    button.type = "button";
    button.textContent = text;
    button.onclick = callback;
    cell.appendChild(
        button,
    )
}