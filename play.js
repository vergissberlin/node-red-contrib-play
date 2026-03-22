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

	var player = require('play-sound')({});

	var ALLOWED_EXT = new Set(['.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac']);
	var MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
	var UPLOAD_ROUTE = '/contrib-playa/upload';

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

	/**
	 * Player options
	 *
	 * @property {*} config Configuration object
	 */
	function PlayaNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		var soundPath = config.soundPath != null ? config.soundPath : '';

		this.on('input', function(msg) {
			var pathToPlay = msg.payload || soundPath || this.name;
			var audio = player.play(
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
