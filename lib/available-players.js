/**
 * Shared logic: which CLI audio players resolve on PATH for a given OS.
 * Used by the Node-RED node and by scripts/print-available-players.mjs.
 */
'use strict';

var child_process = require('child_process');

var PLAYERS_BY_PLATFORM = {
	darwin: ['afplay', 'mplayer', 'mpg123', 'mpg321', 'play'],
	linux: ['aplay', 'mpg123', 'mplayer', 'play', 'omxplayer', 'mpg321', 'cvlc'],
	win32: ['cmdmp3', 'powershell'],
	default: ['mpg123', 'mpg321', 'play', 'cvlc', 'mplayer']
};

function normalizePlatform(platform) {
	if (platform === 'darwin') {
		return 'darwin';
	}
	if (platform === 'linux') {
		return 'linux';
	}
	if (platform === 'win32') {
		return 'win32';
	}
	return 'default';
}

function playersForPlatform(platform) {
	var key = normalizePlatform(platform);
	var list = PLAYERS_BY_PLATFORM[key];
	return list && list.length ? list.slice() : PLAYERS_BY_PLATFORM.default.slice();
}

function commandExists(cmd) {
	try {
		if (process.platform === 'win32') {
			child_process.execSync('where ' + cmd, { stdio: 'ignore' });
		} else {
			child_process.execSync('which ' + cmd, { stdio: 'ignore' });
		}
		return true;
	} catch (e) {
		return false;
	}
}

function filterPlayersOnPath(candidates) {
	return candidates.filter(commandExists);
}

function playersResolvedForPlay(platform) {
	var raw = playersForPlatform(platform);
	var available = filterPlayersOnPath(raw);
	return available.length ? available : raw;
}

/**
 * Same shape as the Node-RED admin GET /contrib-playa/players JSON.
 *
 * @param {string} platformOs process.platform value (e.g. darwin, linux, win32)
 * @returns {{ platform: string, players: string[] }}
 */
function getPlayersPayloadForPlatform(platformOs) {
	return {
		platform: platformOs,
		players: filterPlayersOnPath(playersForPlatform(platformOs))
	};
}

module.exports = {
	PLAYERS_BY_PLATFORM,
	normalizePlatform,
	commandExists,
	playersForPlatform,
	filterPlayersOnPath,
	playersResolvedForPlay,
	getPlayersPayloadForPlatform
};
