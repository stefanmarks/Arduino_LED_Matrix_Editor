
let serialPort = null;
let serialPortReady = false;
let serialWriter;

let serialPortCheckInterval;

async function openPort() {
  serialPort = await navigator.serial.requestPort();

  /* on WebSerial connect/disconnect events seem not to be working */
  serialPort.onconnect = function (event) {
    console.log("onconnect: ", event);
  }

  await serialPort.open({ baudRate: 115200 }); // open the serial port

  /* workaround to detect wether the port has been open */
  if (serialPort.writable && serialPort.readable) {
    setPortState(true);
  }
}

function setPortState(_portState) {
  console.log(_portState);
  serialPortCheckInterval = setInterval(() => {

    if (serialPort.writable && serialPort.readable) {
      serialPortReady = true;
      if (!serialLinkButton.selected) {
        serialLinkButton.loadIcon("UIassets/link_on.png");
        serialLinkButton.selected = true;
        console.log("Serial Port Open");
      }

    } else {
      serialPortReady = false;
      if (serialLinkButton.selected) {
        serialLinkButton.loadIcon("UIassets/link_off.png");
        serialLinkButton.selected = false;
        console.log("Serial Port Closed");
      }
    }
  }, 100);
}

async function writeSerialData(_serialData) {
  if (!serialWriter) {
    serialWriter = serialPort.writable.getWriter(); // create a writable stream

  }
  if (serialPort.writable && serialPort.readable) {
    // debugger;
    // const encodedData = new Uint8Array([0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
    const encodedData = uint32Buffer;
    // debugger;
    await serialWriter.write(encodedData);
  }
}
