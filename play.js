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

	var crypto = require('crypto');
	var fs = require('fs');
	var path = require('path');
	var multer = require('multer');

	var createPlaySound = require('play-sound');
	var ap = require('./lib/available-players.js');
	var getAudioDurationSeconds = require('./lib/audio-duration.js');

	var PLAYERS_ROUTE = '/contrib-playa/players';
	var STOP_ROUTE = '/contrib-playa/stop/:id';
	var cachedPlayersPayload = null;

	/** @type {Map<string, function(): void>} */
	var playaStopByNodeId = new Map();

	function getPlayersApiPayload() {
		if (cachedPlayersPayload) {
			return cachedPlayersPayload;
		}
		cachedPlayersPayload = ap.getPlayersPayloadForPlatform(process.platform);
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

	RED.httpAdmin.post(
		STOP_ROUTE,
		RED.auth.needsPermission('flows.write'),
		function(req, res) {
			var id = req.params != null ? req.params.id : null;
			if (id == null || String(id).trim() === '') {
				return res.status(400).json({ error: 'Missing node id' });
			}
			var runtimeNode = RED.nodes.getNode(id);
			if (!runtimeNode || runtimeNode.type !== 'playa') {
				return res.status(404).json({ error: 'Node not found' });
			}
			var stopFn = playaStopByNodeId.get(id);
			if (!stopFn) {
				return res.status(404).json({ error: 'Node not found' });
			}
			stopFn();
			res.json({ ok: true });
		}
	);

	/**
	 * Resolve local file path or pass through http(s) URL (player-dependent).
	 * Prevents spawning afplay etc. with a missing path (exit code 1) when the binary is fine.
	 *
	 * @param {*} raw
	 * @returns {{ ok: true, path: string } | { ok: false, error: Error }}
	 */
	function resolveSoundFile(raw) {
		if (raw == null) {
			return { ok: false, error: new Error('No sound file path') };
		}
		var s = String(raw).trim();
		if (!s) {
			return { ok: false, error: new Error('No sound file path') };
		}
		if (/^https?:\/\//i.test(s)) {
			return { ok: true, path: s };
		}
		var tries = [s];
		if (!path.isAbsolute(s)) {
			tries.push(path.resolve(s));
			tries.push(path.join(process.cwd(), s));
		}
		for (var i = 0; i < tries.length; i++) {
			var p = tries[i];
			try {
				if (fs.existsSync(p)) {
					var st = fs.statSync(p);
					if (st.isFile()) {
						return { ok: true, path: path.normalize(p) };
					}
					if (st.isDirectory()) {
						return {
							ok: false,
							error: new Error('Sound path is a directory, not a file: ' + s)
						};
					}
				}
			} catch (e) {
				// try next candidate
			}
		}
		return {
			ok: false,
			error: new Error(
				'Sound file not found: ' +
					s +
					'. Use msg.payload, Sound file path, or node name as a path that exists on the Node-RED host.'
			)
		};
	}

	/** @param {*} err */
	function formatStatusError(err) {
		var s = err && err.message != null ? String(err.message) : String(err);
		return s.length > 20 ? s.slice(0, 20) : s;
	}

	/**
	 * @param {number} totalSeconds
	 * @returns {string} m:ss (floor seconds)
	 */
	function formatMmSs(totalSeconds) {
		if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
			return '0:00';
		}
		var sec = Math.floor(totalSeconds);
		var m = Math.floor(sec / 60);
		var s = sec % 60;
		return m + ':' + (s < 10 ? '0' : '') + s;
	}

	/**
	 * Runtime i18n does not interpolate `{{remaining}}` the way the editor does — load the
	 * template and substitute manually so the badge never shows a literal `~{{remaining}}`.
	 *
	 * @param {*} node
	 * @param {string} remainingFormatted
	 * @returns {string}
	 */
	function formatRemainingStatusText(node, remainingFormatted) {
		var key = 'playa.status.remaining';
		var template = null;
		if (typeof node._ === 'function') {
			try {
				template = node._(key);
			} catch (e) {
				// ignore
			}
		}
		if ((template == null || template === key) && typeof RED._ === 'function') {
			try {
				template = RED._(key);
			} catch (e) {
				// ignore
			}
		}
		if (typeof template === 'string' && template !== key && /\{\{\s*remaining\s*\}\}/.test(template)) {
			return template.replace(/\{\{\s*remaining\s*\}\}/g, remainingFormatted);
		}
		return '~' + remainingFormatted;
	}

	/**
	 * @param {*} err play-sound passes exit code from `close` or an Error from spawn
	 * @param {{ path?: string, player?: string }} [ctx]
	 */
	function normalizePlayErr(err, ctx) {
		ctx = ctx || {};
		if (err == null || err === false) {
			return null;
		}
		if (typeof err === 'number') {
			if (err === 0) {
				return null;
			}
			var pl =
				ctx.player != null && String(ctx.player).trim()
					? String(ctx.player).trim()
					: 'unknown';
			var file = ctx.path != null ? String(ctx.path) : '';
			var msg =
				'Player "' +
				pl +
				'" exited with code ' +
				err +
				(file ? ' — ' + file : '') +
				'. Unsupported format, unreadable file, or player args.';
			return new Error(msg);
		}
		return err;
	}

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
		var stopPrevious = config.stopPrevious !== false;
		var sendOnEnd = config.sendOnEnd === true;
		if (playerName && !ap.commandExists(playerName)) {
			node.warn(
				'Player "' +
					playerName +
					'" not found on PATH for this host; using automatic selection.'
			);
			playerName = '';
		}
		var playerOpts = {};
		if (playerName) {
			playerOpts.player = playerName;
		} else {
			playerOpts.players = ap.playersResolvedForPlay(process.platform);
		}
		var audioPlayer = createPlaySound(playerOpts);

		var currentChild = null;
		var currentToken = null;

		function stopPlaybackFromEditor() {
			if (currentToken) {
				currentToken.cancelled = true;
				if (currentToken.statusInterval) {
					clearInterval(currentToken.statusInterval);
					currentToken.statusInterval = null;
				}
			}
			if (currentChild) {
				try {
					currentChild.kill();
				} catch (e) {
					// ignore
				}
				currentChild = null;
			}
			node.status({});
		}

		playaStopByNodeId.set(node.id, stopPlaybackFromEditor);

		node.on('close', function(done) {
			playaStopByNodeId.delete(node.id);
			stopPlaybackFromEditor();
			if (typeof done === 'function') {
				done();
			}
		});

		this.on('input', function(msg) {
			var rawPath = msg.payload || soundPath || this.name;
			var resolvedPath = resolveSoundFile(rawPath);
			if (!resolvedPath.ok) {
				node.status({ fill: 'red', shape: 'dot', text: formatStatusError(resolvedPath.error) });
				node.error(resolvedPath.error);
				return;
			}
			var pathToPlay = resolvedPath.path;
			var isHttp = /^https?:\/\//i.test(pathToPlay);

			if (stopPrevious) {
				if (currentToken) {
					currentToken.cancelled = true;
					if (currentToken.statusInterval) {
						clearInterval(currentToken.statusInterval);
						currentToken.statusInterval = null;
					}
				}
				if (currentChild) {
					try {
						currentChild.kill();
					} catch (e) {
						// ignore
					}
					currentChild = null;
				}
			}

			currentToken = { cancelled: false, statusInterval: null };
			var token = currentToken;
			var endHandled = false;
			var playbackEnded = false;

			node.status({ fill: 'blue', shape: 'dot' });

			function handlePlayEnd(err) {
				playbackEnded = true;
				if (token.statusInterval) {
					clearInterval(token.statusInterval);
					token.statusInterval = null;
				}
				if (token.cancelled) {
					currentChild = null;
					node.status({});
					return;
				}
				if (endHandled) {
					return;
				}
				endHandled = true;
				currentChild = null;
				err = normalizePlayErr(err, {
					path: pathToPlay,
					player: audioPlayer.player || ''
				});
				if (err) {
					node.status({ fill: 'red', shape: 'dot', text: formatStatusError(err) });
					return node.error(err);
				}
				node.status({});
				if (sendOnEnd) {
					node.send(msg);
				}
			}

			var audio = audioPlayer.play(pathToPlay, handlePlayEnd);

			if (!audio) {
				currentToken = null;
				return;
			}
			currentChild = audio;

			if (typeof audio.on === 'function') {
				audio.on('error', function(err) {
					handlePlayEnd(err);
				});
			}

			if (!sendOnEnd) {
				node.send(msg);
			}

			(async function() {
				var durationSec = isHttp ? null : await getAudioDurationSeconds(pathToPlay);
				if (token.cancelled || playbackEnded || durationSec == null) {
					return;
				}

				var startTime = Date.now();
				function tickStatus() {
					if (token.cancelled || playbackEnded) {
						return;
					}
					var elapsed = (Date.now() - startTime) / 1000;
					var remaining = Math.max(0, durationSec - elapsed);
					var text = formatRemainingStatusText(node, formatMmSs(remaining));
					node.status({ fill: 'blue', shape: 'dot', text: text });
				}

				token.statusInterval = setInterval(tickStatus, 500);
				tickStatus();
			})().catch(function(err) {
				if (token.statusInterval) {
					clearInterval(token.statusInterval);
					token.statusInterval = null;
				}
				node.status({ fill: 'red', shape: 'dot', text: formatStatusError(err) });
				node.error(err);
			});
		});
	}

	RED.nodes.registerType('playa', PlayaNode);
};
