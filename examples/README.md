# Example flows

Import any `.json` file here via **Menu → Import** in the Node-RED editor.

## Bundled sound file

This package ships a tiny sample WAV you can play without preparing your own file:

- **`sounds/beep.wav`** — short synthetic tone (mono, PCM), same MIT licence as the package.

After installation, the file usually lives next to the published module, for example:

- **Typical user-directory install (npm / pnpm):**  
  `~/.node-red/node_modules/node-red-contrib-play/examples/sounds/beep.wav`  
  (use the expanded absolute path in **inject** or in the **function** node flow.)

If you use a custom `userDir`, a global Node-RED install, or a non-standard layout, adjust the path accordingly. The **function** node in `Play bundled beep.wav.json` assumes `HOME` / `USERPROFILE` and a local install under `~/.node-red/node_modules/node-red-contrib-play/`.

## Flows

| File | Purpose |
|------|---------|
| `Play sound from payload.json` | You set **payload** to any absolute path to a `.wav` / `.mp3` (or use the bundled `beep.wav` path above). |
| `Play bundled beep.wav.json` | Builds the path to `examples/sounds/beep.wav` under a default `userDir` layout; choose a **Player** that exists on your OS. |

Pick a **Player** on the **playa** node that matches your system (e.g. `afplay` on macOS, `aplay` or `play` on many Linux systems, `cmdmp3` on Windows if installed).
