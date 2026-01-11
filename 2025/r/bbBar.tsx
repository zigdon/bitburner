export async function main(ns: NS) {
  /** @type Window */
  const win = eval("window")
  /** @type Document */
  const doc = eval("document")
  const React = win.React
  const ReactDOM = win.ReactDOM;

  function StamBar() {
    const [val, setVal] = React.useState([0, 0]);

    React.useEffect(() => {
      const interval = setInterval(() => {
        ns.print(ns.bladeburner.getStamina());
        setVal(ns.bladeburner.getStamina());
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    return [
      React.createElement('th', {
        key: 'label',
        className: "MuiTableCell-root MuiTableCell-body MuiTableCell-sizeMedium css-wv5f3v-cellNone",
        style: { color: 'white' }
      }, 'Stamina '),
      React.createElement('td', {
        key: 'val',
        className: "MuiTableCell-root MuiTableCell-body MuiTableCell-alignRight MuiTableCell-sizeMedium css-1nv618x-cellNone",
        style: { color: 'white' }
      }, `${ns.sprintf("%d/%d", val[0], val[1])}`)
    ];
  }

  const moneyLine = doc.querySelector('tr:has(#overview-money-hook)');

  if (!moneyLine) {
    ns.tprint("Could not find the money line!");
    return;
  }

  const container = doc.createElement('tr');
  container.className = "MuiTableRow-root css-1dix92e"

  doc.querySelector(
    'tbody:has(#overview-money-hook)'
  ).insertBefore(container, moneyLine);

  ReactDOM.render(React.createElement(StamBar), container);

  ns.atExit(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  while (true) await ns.asleep(10000);
}
