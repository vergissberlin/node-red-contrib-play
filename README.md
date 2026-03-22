# node-red-contrib-play

> Output node for Node-RED that triggers local audio playback via a command-line player.

[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/?branch=master)
[![Build Status](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/badges/build.png?b=master)](https://scrutinizer-ci.com/g/programmerqeu/node-red-contrib-play/build-status/master)

## What it does

The **playa** node receives a message, asks the underlying [`play-sound`](https://www.npmjs.com/package/play-sound) helper to start playback for a file path, then forwards the same message to its output (by default **right after playback starts**). Optionally you can send the message **after the player exits**, and you can **stop the previous playback** when a new message arrives. Playback errors are reported on the node (via `node.error`).

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

### Listing available players on the host (CLI)

The editor dropdown uses the same discovery as this package’s helper script: it runs `which` / `where` for each known CLI name. It does **not** decode audio files; it only checks that the binary exists on `PATH` for the Node-RED process.

From a clone of this repo (or after `npm install` in the package folder):

```bash
pnpm run players:list
# or: node scripts/print-available-players.mjs
# JSON: node scripts/print-available-players.mjs --json
```

**macOS:** to confirm `afplay` can open a real file (exit code 0), from the repo:

```bash
pnpm run players:verify-afplay
```

If that fails, the problem is outside Node-RED (path, permissions, or `afplay` itself).

## Usage

### Message contract

| Property      | Role                                                                                                                                 |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `msg.payload` | Path to the sound file (string). If missing or empty, the node uses **Sound file path** from the node, then **Name**, as the path. |
| Output timing | Controlled by **Send output when playback finishes**: off = send after playback **starts** (default); on = send after the player **exits** successfully. |
| Overlap       | **Stop previous playback** (default on) ends the last player process before starting the next file; turn off to allow overlapping sounds. |

By default the node **sends the incoming message** to the output right after playback **starts** (same object reference). If **Send output when playback finishes** is enabled, the message is sent after the player process **exits successfully** instead. Connect downstream nodes if you need to chain logic after a play request or after playback ends.

### Editor fields

- **Name:** Node label in the editor and the **last fallback path** when `msg.payload` and **Sound file path** are empty.
- **Sound file path:** Optional absolute path on the Node-RED host. Use **Choose file & upload** to pick a file; the dialog shows **uploading**, then **success with the saved path** or an **error message** next to the button. Files are stored under `node-red-contrib-play/uploads` inside your Node-RED user directory (generated filename). Allowed extensions: `.wav`, `.mp3`, `.ogg`, `.flac`, `.m4a`, `.aac`; maximum size **10 MB** per upload. Exported flows do **not** include uploaded binaries—copy or back up that folder if you move instances.
- **Preview:** The dialog includes a small browser **Preview** player that streams the file through the Node-RED admin HTTP API only when the resolved path stays **inside your Node-RED user directory** (same extensions as uploads); paths elsewhere on the host cannot be previewed in the editor.
- **Player:** The dropdown is filled from the **Node-RED server** (not the browser): it lists CLI players that match the server OS and, when possible, that are found on `PATH`. Choose **Automatic** to let `play-sound` pick the first available binary in that order. A value saved from another machine/OS may still appear as an extra option so the flow stays editable.
- **Stop previous playback:** When enabled (default), starting a new sound stops the still-running player from the previous input. Disable to allow overlapping playback from rapid triggers.
- **Send output when playback finishes:** When enabled, `msg` is sent after the player exits successfully; when disabled (default), `msg` is sent immediately after the play process is spawned (legacy behaviour).
- **Status:** While a **local file** is playing, the node badge can show **approximate remaining time** (e.g. `~1:23`), derived from file metadata. **HTTP(S) URLs** or formats where duration cannot be read keep the plain blue playing indicator. The estimate may drift slightly from the CLI player’s actual progress.

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
- **`spawn … ENOENT`:** The chosen CLI (for example `mplayer`) is not installed or not on `PATH` for the Node-RED process. Install it, use **Automatic** so only players that resolve on this host are used, or pick another **Player**. If you saved a flow from another machine, an invalid player name is ignored with a warning and automatic selection is used.
- **`Player "…" exited with code 1`:** `afplay` (or another CLI) **started** but rejected the file—often **wrong/missing path**, **unsupported format**, or **permissions**. The node now checks that a **local file exists** before spawning the player. If you still see exit code 1, the file exists but the player cannot decode it—try WAV, another **Player**, or run `pnpm run players:verify-afplay` on macOS to test `afplay` outside Node-RED.
- **Upload fails in the editor (403 / CSRF):** Ensure your Node-RED version supplies a CSRF token to the editor; the upload request sends `X-CSRF-Token` when available. If uploads always fail, check the browser network tab for the `/contrib-playa/upload` response body.
- **Errors in the debug sidebar:** Read the message from `node.error`; it usually reflects the underlying player or spawn failure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to run tests and load this package into a local Node-RED while developing.

## Thanks

1. This node builds on ideas from [`say`](https://www.npmjs.com/package/say) / console audio patterns — thanks to Marak and the ecosystem.
2. [Node-RED](https://nodered.org) is a core tool for wiring IoT and automation flows; it is open source and was created at IBM.
