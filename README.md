# node-red-contrib-play

> Output node for Node-RED that triggers local audio playback via a command-line player.

[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/?branch=master)
[![Build Status](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/badges/build.png?b=master)](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/build-status/master)

## What it does

The **playa** node receives a message, asks the underlying [`play-sound`](https://www.npmjs.com/package/play-sound) helper to start playback for a file path, then forwards the same message to its output. Playback errors are reported on the node (via `node.error`).

## Requirements

- **Node-RED** `>= 2.0.0`
- **Node.js** `>= 18`
- A **supported audio CLI** on the machine running Node-RED (see [play-sound](https://www.npmjs.com/package/play-sound)). Typical choices:
  - **macOS:** `afplay` (often preinstalled)
  - **Linux:** `aplay`, `mpg123`, `mplayer`, or SoX `play` (package names vary by distribution)
  - **Windows:** e.g. `cmdmp3` or another player you install and expose on `PATH`

Palette labels, dialog text, and the Info sidebar help for **playa** are translated for multiple editor locales (see `locales/` in this package). The language follows the Node-RED editor language setting.

## Install

From the directory where Node-RED is installed (or your user data directory, depending on your setup):

```bash
npm install node-red-contrib-play
```

Restart Node-RED, then find **playa** under the **output** category in the palette.

### Linux (Debian/Ubuntu)

SoX is a common way to get the `play` command and broad format support:

```bash
sudo apt-get install sox libsox-fmt-all
```

## Usage

### Message contract

| Property      | Role                                                                                                                                 |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `msg.payload` | Path to the sound file (string). If missing or empty, the node uses **Sound file path** from the node, then **Name**, as the path. |

The node **always sends the incoming message** to the output after starting playback (same object reference as in the tests). Connect downstream nodes if you need to chain logic after a play request.

### Editor fields

- **Name:** Node label in the editor and the **last fallback path** when `msg.payload` and **Sound file path** are empty.
- **Sound file path:** Optional absolute path on the Node-RED host. You can type it or set it by choosing **Upload sound file** (files are stored under `node-red-contrib-play/uploads` inside your Node-RED user directory, with a generated filename). Allowed extensions: `.wav`, `.mp3`, `.ogg`, `.flac`, `.m4a`, `.aac`; maximum size **10 MB** per upload. Exported flows do **not** include uploaded binaries—copy or back up that folder if you move instances.
- **Player:** Dropdown in the editor lists common players (`afplay`, `mplayer`, `mpg123`, etc.). Runtime selection is performed by `play-sound` based on what is available on your system unless you extend the node to pass a specific player through.

### Example flow

1. Add an **inject** node and set **payload** to an absolute path to a `.wav` or `.mp3` on the host (for example `/path/to/your/sound.wav` on Linux/macOS).
2. Wire **inject** → **playa** → (optional) further nodes.
3. Deploy and click the inject button.

Ready-made flows are in the package (see **`examples/README.md`**):

- **`examples/Play sound from payload.json`** — set **payload** to an audio file path.
- **`examples/Play bundled beep.wav.json`** / **`Play bundled beep.mp3.json`** — bundled samples **`examples/sounds/beep.wav`** and **`beep.mp3`** (when the default install layout matches).
- **`examples/Play bundled beep compare wav and mp3.json`** — try **WAV** and **MP3** side by side.

Import via **Menu → Import** in the Node-RED editor.

Minimal flow (excerpt):

```json
[
  {
    "type": "inject",
    "name": "play file",
    "payload": "/path/to/your/sound.wav",
    "payloadType": "str",
    "wires": [["playa-node-id"]]
  },
  {
    "type": "playa",
    "name": "",
    "player": "afplay",
    "wires": [[]]
  }
]
```

Replace the payload with a real file path on the machine where Node-RED runs.

## Troubleshooting

- **No sound:** Confirm the file exists, the path is correct for the OS user running Node-RED, and a player binary is installed and on `PATH`.
- **Errors in the debug sidebar:** Read the message from `node.error`; it usually reflects the underlying player or spawn failure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to run tests and load this package into a local Node-RED while developing.

## Thanks

1. This node builds on ideas from [`say`](https://www.npmjs.com/package/say) / console audio patterns — thanks to Marak and the ecosystem.
2. [Node-RED](https://nodered.org) is a core tool for wiring IoT and automation flows; it is open source and was created at IBM.
