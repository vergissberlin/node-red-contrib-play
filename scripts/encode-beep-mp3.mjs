#!/usr/bin/env node
/**
 * Regenerate examples/sounds/beep.mp3 from beep.wav (requires `lame` on PATH).
 * Repo root: node scripts/encode-beep-mp3.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const wav = join(root, 'examples', 'sounds', 'beep.wav');
const mp3 = join(root, 'examples', 'sounds', 'beep.mp3');

if (!existsSync(wav)) {
	console.error('Missing:', wav);
	process.exit(1);
}

try {
	execFileSync('lame', ['-V', '7', wav, mp3], { stdio: 'inherit' });
	console.log('Wrote', mp3);
} catch {
	console.error('`lame` failed. Install it (e.g. brew install lame) and retry.');
	process.exit(1);
}
