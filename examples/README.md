# Example flows

Import any `.json` file here via **Menu → Import** in the Node-RED editor.

## Bundled sound files

This package ships short synthetic samples you can play without preparing your own files (MIT licence, same as the package):

| File | Format |
|------|--------|
| **`sounds/beep.wav`** | PCM WAV |
| **`sounds/beep.mp3`** | MP3 (same tone as the WAV; encoded from `beep.wav`) |

After installation, files usually live under the published module, for example:

- **Typical user-directory install (npm / pnpm):**  
  `~/.node-red/node_modules/node-red-contrib-play/examples/sounds/beep.wav`  
  `~/.node-red/node_modules/node-red-contrib-play/examples/sounds/beep.mp3`  

Use the **expanded absolute path** in **inject** or in the **function** node flows.

If you use a custom `userDir`, a global Node-RED install, or a non-standard layout, adjust the path accordingly. The **function** nodes in the bundled flows assume `HOME` / `USERPROFILE` and a local install under `~/.node-red/node_modules/node-red-contrib-play/`.

### Regenerating `beep.mp3`

Maintainers can recreate `beep.mp3` from `beep.wav` with [LAME](https://lame.sourceforge.io/) (`lame` on `PATH`):

```bash
node scripts/encode-beep-mp3.mjs
```

## Flows

| File | Purpose |
|------|---------|
| `Play sound from payload.json` | You set **payload** to any absolute path to a supported file (`.wav`, `.mp3`, …). |
| `Play bundled beep.wav.json` | Path to `examples/sounds/beep.wav` (default `userDir` layout). |
| `Play bundled beep.mp3.json` | Path to `examples/sounds/beep.mp3` (same layout). |
| `Play bundled beep compare wav and mp3.json` | Two chains side by side to try **WAV** vs **MP3** with the bundled samples. |

Pick a **Player** on each **playa** node that matches the format and your OS (e.g. `afplay` on macOS for both WAV and MP3; on Linux often `aplay`/`play` for WAV and `mpg123` or `mplayer` for MP3; `cmdmp3` on Windows if installed).
