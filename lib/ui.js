var names = new Map();

/**
 * @param {string} id
 **/
export function rmCustomOverview(id) {
    var row;
    if (row = document.getElementById("z"+id)) {
        row.remove();
    }
    names.delete(id);
}

/**
 * @param {string} id
 * @param {string} name
 **/
export function customOverview(id, name) {
    var shareRow;
    if (!(shareRow = document.getElementById("z"+id))) {
        names.set(id, name);
        var hook = document.getElementById("overview-extra-hook-2");
        var cellCls = hook.className;
        var thCls = hook.parentElement.className;
        var peer = hook.parentElement.parentElement;
        var trCls = peer.className;
        shareRow = document.createElement("tr");
        shareRow.id = "z"+id;
        shareRow.className = trCls;
        var shareHead = document.createElement("th");
        shareHead.className = thCls;
        var shareLbl = shareRow.insertCell(0)
        shareLbl.className = cellCls;
        shareLbl.innerText = name;
        var shareVal = shareRow.insertCell(1);
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
    if (!document.getElementById("z"+id)) {
        if (names.has(id)) {
            customOverview(id, names.get(id))
        } else {
            return false;
        }
    }
    var cell = document.getElementById("z"+id+"Val");
    cell.innerText = val;
}

/**
 * @param {string} process
 */
export function findLogWindow(process) {
   var divs = document.getElementsByTagName("div");
   for (var i=0; i<divs.length; i++) {
       var d = divs.item(i);
       if (d.classList.contains("react-draggable") && d.innerText.startsWith(process)) {
            console.log(d);
       }
   }
}