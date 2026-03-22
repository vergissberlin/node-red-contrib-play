# Deploy and Host

_Use this page for the **Railway** service or template **description** (copy into the dashboard or link to this file). Full package docs: [README.md](README.md)._

## About Hosting

**Node-RED** (and nodes like **playa** from **node-red-contrib-play**) run in the **Railway** container as the runtime process. The **editor** is loaded in the browser from your public URL; **audio playback** runs only on the **host** where Node-RED executes—here, the Railway service—via a CLI player, not in the visitor’s browser. In a typical cloud deployment there is often **no physical speaker**; use this deployment to try flows, the palette, and APIs. For audible output, run Node-RED on hardware with audio (e.g. Raspberry Pi, desktop, or a VM with audio forwarding).

## Why Deploy

In Node-RED, **Deploy** pushes the current flow to the runtime. Until you deploy, **playa** does not run your latest wiring. The editor **stop** button on the node calls the admin HTTP API on the **deployed** instance, so deploy first if you want stop/playback behaviour to match what you see in the editor.

## Common Use Cases

- **Automation:** trigger sounds when events fire (when the host can play audio).
- **Prototyping:** wire **playa** with inject/debug on Railway to validate flows before moving to a device with speakers.
- **Integration:** combine with HTTP, MQTT, and other nodes in the same flow.

## Dependencies for

What the Railway image/runtime should provide when hosting Node-RED with **node-red-contrib-play**.

### Deployment Dependencies

- **Node.js** `>= 18` and **Node-RED** `>= 2.0.0` (see [README.md](README.md) → Requirements).
- **Audio CLI** on the container `PATH` if you rely on local file playback (e.g. SoX `play`, `mpg123`—install in your Dockerfile or Railway build). **play-sound** picks an available binary when **Player** is automatic.
- **Environment:** set a strong `NODE_RED_CREDENTIAL_SECRET` (or your stack’s auth) and replace demo credentials for anything beyond a throwaway demo.
- **Files:** sound paths refer to paths **inside** the container; uploads go under the Node-RED user directory as described in the main README.

## Demo

| Key      | Value |
|----------|-------|
| Username | admin |
| Password | admin |

**Editor / backend URL:** [https://demo-nodered.up.railway.app/](https://demo-nodered.up.railway.app/)

Treat these as **demo credentials** only.

**Note:** **playa** plays on the **Node-RED host** (Railway container). There is no sound in the browser; in the cloud you may hear nothing—use the demo to explore the editor and flows.

## What is Node-RED

[Node-RED](https://nodered.org/) is an open-source, flow-based programming tool with a visual editor for wiring together hardware, APIs, and online services. You connect **nodes** to define how data and events move through a flow. A large library of community nodes (including palette packages like **node-red-contrib-play**) makes it practical to build IoT integrations, automations, and glue between systems without writing a full application from scratch.
