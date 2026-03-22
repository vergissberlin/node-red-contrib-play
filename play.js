/**
 * Play sound node for NodeRED
 *
 * LICENSE:    MIT
 *
 * @project    node-red-contrib-play
 * @package    Programmerq\Nodered\Node\Play
 * @author     André Lademann <andre@programmerq.eu>
 * @copyright  Copyright programmerq.eu (http://www.programmerq.eu)
 * @license    MIT https://opensource.org/licenses/MIT
 * @since      2014-11-27 - 08:53:21 AM
 */

module.exports = function(RED) {
	'use strict';

	var child_process = require('child_process');
	var crypto = require('crypto');
	var fs = require('fs');
	var path = require('path');
	var multer = require('multer');

	var createPlaySound = require('play-sound');

	var PLAYERS_BY_PLATFORM = {
		darwin: ['afplay', 'mplayer', 'mpg123', 'mpg321', 'play'],
		linux: ['aplay', 'mpg123', 'mplayer', 'play', 'omxplayer', 'mpg321', 'cvlc'],
		win32: ['cmdmp3', 'powershell'],
		default: ['mplayer', 'mpg123', 'mpg321', 'play', 'cvlc']
	};

	var PLAYERS_ROUTE = '/contrib-playa/players';
	var cachedPlayersPayload = null;

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
				child_process.execSync('where ' + cmd, {stdio: 'ignore'});
			} else {
				child_process.execSync('which ' + cmd, {stdio: 'ignore'});
			}
			return true;
		} catch (e) {
			return false;
		}
	}

	function filterPlayersOnPath(candidates) {
		var filtered = candidates.filter(commandExists);
		return filtered.length ? filtered : candidates;
	}

	function getPlayersApiPayload() {
		if (cachedPlayersPayload) {
			return cachedPlayersPayload;
		}
		var raw = playersForPlatform(process.platform);
		cachedPlayersPayload = {
			platform: process.platform,
			players: filterPlayersOnPath(raw)
		};
		return cachedPlayersPayload;
	}

	var ALLOWED_EXT = new Set(['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac']);
	var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
	var UPLOAD_ROUTE = '/contrib-playa/upload';
	var PREVIEW_ROUTE = '/contrib-playa/preview';
	var MIME_BY_EXT = {
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.ogg': 'audio/ogg',
		'.flac': 'audio/flac',
		'.m4a': 'audio/mp4',
		'.aac': 'audio/aac'
	};

	var uploadDir = path.join(RED.settings.userDir, 'node-red-contrib-play', 'uploads');
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			fs.mkdirSync(uploadDir, { recursive: true });
			cb(null, uploadDir);
		},
		filename: function(req, file, cb) {
			var ext = path.extname(file.originalname || '').toLowerCase();
			cb(null, crypto.randomUUID() + ext);
		}
	});
	var upload = multer({
		storage: storage,
		limits: { fileSize: MAX_UPLOAD_BYTES },
		fileFilter: function(req, file, cb) {
			var ext = path.extname(file.originalname || '').toLowerCase();
			if (ALLOWED_EXT.has(ext)) {
				cb(null, true);
			} else {
				cb(new Error('Invalid file type'));
			}
		}
	});

	RED.httpAdmin.post(
		UPLOAD_ROUTE,
		RED.auth.needsPermission('flows.write'),
		function(req, res) {
			upload.single('file')(req, res, function(err) {
				if (err) {
					if (err instanceof multer.MulterError) {
						if (err.code === 'LIMIT_FILE_SIZE') {
							return res.status(400).json({ error: 'File too large' });
						}
					}
					return res.status(400).json({ error: err.message || 'Upload failed' });
				}
				if (!req.file) {
					return res.status(400).json({ error: 'No file' });
				}
				res.json({ path: req.file.path });
			});
		}
	);

	RED.httpAdmin.get(
		PREVIEW_ROUTE,
		RED.auth.needsPermission('flows.read'),
		function(req, res) {
			var raw = req.query.path;
			if (raw == null || String(raw).trim() === '') {
				return res.status(400).json({ error: 'Missing path' });
			}
			var requestedPath = String(raw);
			var realUser;
			try {
				realUser = fs.realpathSync(RED.settings.userDir);
			} catch (e) {
				return res.status(500).json({ error: 'User directory unavailable' });
			}
			var realFile;
			try {
				realFile = fs.realpathSync(path.resolve(requestedPath));
			} catch (e) {
				return res.status(404).json({ error: 'Not found' });
			}
			var ext = path.extname(realFile).toLowerCase();
			if (!ALLOWED_EXT.has(ext)) {
				return res.status(400).json({ error: 'Invalid file type' });
			}
			var rel = path.relative(realUser, realFile);
			if (rel.startsWith('..') || path.isAbsolute(rel)) {
				return res.status(403).json({ error: 'Forbidden' });
			}
			var st;
			try {
				st = fs.statSync(realFile);
			} catch (e) {
				return res.status(404).json({ error: 'Not found' });
			}
			if (!st.isFile()) {
				return res.status(400).json({ error: 'Not a file' });
			}
			var mime = MIME_BY_EXT[ext] || 'application/octet-stream';
			res.setHeader('Content-Type', mime);
			res.setHeader('Content-Length', st.size);
			var stream = fs.createReadStream(realFile);
			stream.on('error', function() {
				if (!res.headersSent) {
					res.status(500).end();
				} else {
					res.destroy();
				}
			});
			stream.pipe(res);
		}
	);

	RED.httpAdmin.get(
		PLAYERS_ROUTE,
		RED.auth.needsPermission('flows.read'),
		function(req, res) {
			res.json(getPlayersApiPayload());
		}
	);

	/**
	 * Player options
	 *
	 * @property {*} config Configuration object
	 */
	function PlayaNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		var soundPath = config.soundPath != null ? config.soundPath : '';
		var playerName = (config.player != null && String(config.player).trim()) || '';
		var playerOpts = {};
		if (playerName) {
			playerOpts.player = playerName;
		} else {
			playerOpts.players = playersForPlatform(process.platform);
		}
		var audioPlayer = createPlaySound(playerOpts);

		this.on('input', function(msg) {
			var pathToPlay = msg.payload || soundPath || this.name;
			var audio = audioPlayer.play(
				pathToPlay,
				function(err) {
					if (err) {
						return node.error(err);
					}
				});
			audio.kill();
			node.send(msg);
		});
	}

	RED.nodes.registerType('playa', PlayaNode);
};
