#!/usr/bin/env node
/**
 * Prints CLI audio players that resolve on PATH on this machine,
 * using the same logic as the playa node and the editor dropdown.
 *
 * Usage:
 *   node scripts/print-available-players.mjs
 *   node scripts/print-available-players.mjs --json
 *   pnpm run players:list
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ap = require('../lib/available-players.js');

const json = process.argv.includes('--json');
const data = ap.getPlayersPayloadForPlatform(process.platform);
const resolved = ap.playersResolvedForPlay(process.platform);

if (json) {
	console.log(
		JSON.stringify(
			{
				...data,
				resolvedForAutomaticPlay: resolved,
				hint:
					'players = binaries found on PATH (which/where). resolvedForAutomaticPlay matches what playa uses when Player is Automatic.'
			},
			null,
			2
		)
	);
	process.exit(0);
}

console.log('OS platform:', data.platform);
console.log('');
console.log('Players on PATH (order used in the editor list):');
if (data.players.length === 0) {
	console.log('  (none — install a CLI player or fix PATH)');
} else {
	for (const p of data.players) {
		console.log('  -', p);
	}
}
console.log('');
console.log('List used for automatic playback (play-sound):');
console.log(' ', resolved.join(', ') || '(empty — will fall back to full candidate list)');
console.log('');
console.log('This uses the same checks as Node-RED (which/where), not a full decode test.');
