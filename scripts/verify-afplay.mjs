#!/usr/bin/env node
/**
 * Smoke-test: run afplay on the bundled example WAV (same host as Node-RED should use).
 * Exit 0 = afplay can open and play the file; non-zero = OS/player issue, not Node-RED.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wav = path.join(__dirname, '..', 'examples', 'sounds', 'beep.wav');

const r = spawnSync('afplay', [wav], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
if (r.error) {
	console.error(r.error.message);
	process.exit(1);
}
console.log('afplay exit code:', r.status, '(0 = ok)');
if (r.stderr) {
	process.stderr.write(r.stderr);
}
process.exit(r.status === 0 ? 0 : 1);
