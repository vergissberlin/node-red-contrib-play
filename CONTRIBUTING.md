# Contributing

This document explains how to work on **node-red-contrib-play** locally: run tests, wire the package into a Node-RED instance, and iterate on the node.

## Prerequisites

- **Node.js** 18 or newer (see `engines` in `package.json`).
- **pnpm** (preferred for this repo).
- A running **Node-RED** 2.x or newer if you want to exercise the node in the editor (see [Node-RED installation](https://nodered.org/docs/getting-started/installation)).

## Clone and install

```bash
git clone https://github.com/programmerqeu/node-red-contrib-play.git
cd node-red-contrib-play
pnpm install
```

## Tests

The suite uses Node’s built-in test runner:

```bash
pnpm test
```

Run this after changes to `play.js`, `play.html`, or tests under `test/`.

## Use the node in a local Node-RED

Node-RED loads nodes from its **user directory** (`userDir`), not from your git clone, unless you connect them. Two common approaches:

### Option A: `pnpm link` (good for frequent edits)

From your Node-RED **user directory** (often `~/.node-red` on Linux/macOS), point at your clone using a **path** (see [pnpm link](https://pnpm.io/cli/link)):

```bash
cd ~/.node-red   # or your custom userDir
pnpm link /absolute/path/to/node-red-contrib-play
```

Restart Node-RED. The **playa** node should appear under **output** after a refresh of the palette if needed.

Edits in the clone are visible after **restart** (Node-RED does not hot-reload contrib code).

To remove the link later, from the same `userDir`:

```bash
pnpm unlink node-red-contrib-play
```

**Alternative:** link via a global registration — from the clone run `pnpm link` (no path) after `pnpm install`, then in `userDir` run `pnpm link node-red-contrib-play` by package name. Path-based linking is usually simpler.

### Option B: Install from the local path

From your `userDir`:

```bash
cd ~/.node-red
pnpm add /absolute/path/to/node-red-contrib-play
```

Useful when you prefer a normal dependency entry instead of a global link. Bump or reinstall after major local changes if needed.

### Custom user directory

If you start Node-RED with a custom `userDir`, use that path instead of `~/.node-red`:

```bash
node-red --userDir /path/to/my-nr-data
```

## What to edit

| File | Purpose |
|------|---------|
| `play.js` | Runtime: registers the node, handles messages, calls `play-sound`. |
| `play.html` | Editor: palette label, defaults, and the edit dialog. |
| `examples/*.json` | Sample flows for **Menu → Import**. |

## Audio player on the dev machine

Playback still depends on a CLI player on the host (see the main README). Install something appropriate (e.g. `afplay` on macOS, SoX `play` on Linux) so manual tests in Node-RED actually produce sound.

## Pull requests

- Prefer **Conventional Commits**-style messages (e.g. `fix:`, `feat:`, `chore:`).
- Run `pnpm test` before opening a PR.
- Keep changes focused; update tests when behaviour or contracts change.
