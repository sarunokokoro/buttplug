import {
  ButtplugClient,
  ButtplugBrowserWebsocketClientConnector,
} from "https://cdn.jsdelivr.net/npm/buttplug@3.2.1/dist/web/buttplug.mjs";
import { ButtplugWasmClientConnector } from "https://cdn.jsdelivr.net/npm/buttplug-wasm@2.0.1/dist/buttplug-wasm.mjs";

/*
 * This is the function that is run whenever a user clicks a button
 * on the webpage.
 */

let clickHandler = async (connectAddress) => {
  /*
   * The ButtplugClient class is our main access to Buttplug Servers, both
   * local and remote. This class allows us to connect to servers, query devices
   * and send messages to them. It'll wrap a bunch of functionality you may have
   * seen in the message spec, including ping handling and message ID tracking.
   * Handy!
   */
  let client = new ButtplugClient("Tutorial Client");
  /*
   * The 'deviceadded' event is emitted any time the client is made aware of a device it did not
   * know of before. This could mean a new connection, or it could mean that we are being made aware of
   * a device that was connected before the client has established contact with the server. Some servers
   * persist device connections for various reasons (mostly because Microsoft's BLE API is fucking broken,
   * though.).
   *
   * As we can receive "deviceadded" calls on client connect (when we connect to a server that already has
   * devices connected), we set up this event handler before we call connect.
   */
  client.addListener("deviceadded", async (device) => {
    /*
     * Here's where we'll make devices vibrate. We get a device object,
     * which consists of a device index, device name, and a list of messages the device can take.
     * (https://metafetish.github.io/buttplug-js/classes/device.html). If we see something added that
     * can vibrate, we'll send a message to start vibrating, then 3 seconds later, a message to stop.
     */

    // Let's at least show the user we know something is connected, by adding the device name
    // to a list on the page.
    let ul = document.getElementById("devices");
    let li = document.createElement("li");
    li.appendChild(document.createTextNode(device.name));

    // To check whether something can vibrate, we currently look for the ScalarCmd message with a Vibrate Actuator
    // in the allowed messages list. Luckily, the client API makes this easier for us by just giving use "vibrate"
    // actuators, and handles conversion to ScalarCmd for us.
    if (device.vibrateAttributes.length > 0) {
      // Ok, we have a device that vibrates. Let's make it vibrate. We'll put a button that, when clicked, sends
      // a vibrate message to the server. We'll use the client's SendDeviceMessage
      // function to do this, with the device object and a new message object. We'll await this, as the
      // server will let us know when the message has been successfully sent.
      let button = document.createElement("button");
      button.innerHTML = "Click to vibrate";
      button.addEventListener("click", async () => {
        await device.vibrate(1.0);

        // Now we set a timeout for 3 seconds in the future, to stop the device.
        setTimeout(async () => {
          await device.stop();
        }, 3000);
      });
      ul.appendChild(li);
      li.appendChild(button);
    }

    // At this point, let's just say we're done. Ask the server to stop scanning if it is currently doing so.
    await client.stopScanning();
  });
  client.addListener("scanningfinished", async (device) => {
    console.log("Scanning Finished");
  });

  /*
   * Now we'll try to connect to a server. Based on the button pushed
   * by the user, we'll either try to connect to a remote websocket server,
   * or to a local in-browser server.
   */
  if (connectAddress !== undefined) {
    try {
      /*
       * Here's how we connect to a remote server. For sake of simplicity, I'm assuming we're running
       * a websocket server on the same machine as the web browser we're on. The Intiface Central Websocket
       * Server defaults to port 12345, with an endpoint of "buttplug". Since we assume it's on the same
       * machine as this browser, we can use ws://.
       */
      const connector = new ButtplugBrowserWebsocketClientConnector(
        "ws://127.0.0.1:12345/buttplug"
      );      
      await client.connect(connector);
    } catch (e) {
      // If something goes wrong, we're just logging to the console here. This is a tutorial on a development
      // website, so we figure the developer has already read the code and knows to look at the console.
      // At least, we hope.
      console.log(e);
      return;
    }
  } else {
    try {
      ButtplugWasmClientConnector.activateLogging();
      const connector = new ButtplugWasmClientConnector();
      console.log("connecting");
      await client.connect(connector);
      console.log("Connected");
    } catch (e) {
      // If something goes wrong, we're just logging to the console here. This is a tutorial on a development
      // website, so we figure the developer has already read the code and knows to look at the console.
      // At least, we hope.
      console.log(e);
      return;
    }
  }

  /*
   * Now we've got a client up and running, we'll need to scan for devices. Calling StartScanning will
   * scan on all available busses. Some will scan until told to stop (bluetooth), others will scan once
   * and return (gamepads, usb, etc...). When a device is found, a "deviceadded" event is emitted.
   */
  console.log("Starting scanning");
  await client.startScanning();
};

onload = () => {
  document.getElementById("buttplug-websocket-button").onclick = () => clickHandler(
    "ws://127.0.0.1:12345/buttplug"
  );
  document.getElementById("buttplug-local-button").onclick = () => clickHandler();
};
