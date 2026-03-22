/**
 * Reads audio duration (seconds) for local files; returns null for URLs or on failure.
 *
 * @param {string} filePath
 * @returns {Promise<number|null>}
 */
'use strict';

module.exports = async function getAudioDurationSeconds(filePath) {
	if (filePath == null || /^https?:\/\//i.test(String(filePath))) {
		return null;
	}
	try {
		var mm = await import('music-metadata');
		var meta = await mm.parseFile(String(filePath));
		if (
			meta.format.duration != null &&
			Number.isFinite(meta.format.duration) &&
			meta.format.duration > 0
		) {
			return meta.format.duration;
		}
	} catch (e) {
		// ignore
	}
	return null;
};
