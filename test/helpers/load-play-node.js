/**
 * Loads play.js with a mocked play-sound package and a minimal RED runtime stub.
 */
'use strict';

const path = require('path');
const { EventEmitter } = require('events');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const availablePlayersPath = path.resolve(__dirname, '..', '..', 'lib', 'available-players.js');
const realAvailablePlayers = require(availablePlayersPath);
/** Pretend any configured CLI name exists so tests do not depend on host PATH (e.g. afplay on Linux CI). */
const mockAvailablePlayers = Object.assign({}, realAvailablePlayers, {
	commandExists: function mockCommandExists() {
		return true;
	}
});

/**
 * @param {function(string, function(Error|null): void): { kill?: function(): void }} playImpl
 *        Implementation for the play-sound instance’s `.play(what, options?, next?)` behaviour.
 * @param {{ playSoundOptsLog?: object[], audioDurationSeconds?: number|null }} [options]
 * @returns {{ RED: object, PlayaNode: function(object): import('events').EventEmitter }}
 */
function loadPlayWithMock(playImpl, options) {
	if (!options) {
		options = {};
	}
	var audioDurationSeconds =
		options.audioDurationSeconds !== undefined ? options.audioDurationSeconds : null;
	const registered = {};
	const nodesById = new Map();
	const RED = {
		settings: {
			userDir: '/tmp/node-red-test-userdir'
		},
		_postHandlers: [],
		httpAdmin: {
			post: function post(route, auth, handler) {
				if (arguments.length >= 3 && typeof handler === 'function') {
					RED._postHandlers.push({ route, handler });
					return;
				}
				if (typeof auth === 'function') {
					RED._postHandlers.push({ route, handler: auth });
				}
			},
			get: function get() {
				// Preview route registration; no-op for unit tests.
			}
		},
		auth: {
			needsPermission: function needsPermission() {
				return function noop(req, res, next) {
					if (typeof next === 'function') {
						next();
					}
				};
			}
		},
		nodes: {
			createNode(node, config) {
				Object.setPrototypeOf(node, EventEmitter.prototype);
				EventEmitter.call(node);
				node.name = config.name != null ? config.name : '';
				node.id = config.id != null ? config.id : 'n1';
				node.type = 'playa';
				nodesById.set(node.id, node);
				node._statusLog = [];
				node.status = function status(s) {
					node._statusLog.push(s);
				};
				node.send = function (msg) {
					node._sent = msg;
				};
				node.error = function (err) {
					node._err = err;
				};
				node.warn = function () {};
				node._ = function _(key) {
					if (key === 'playa.status.remaining') {
						return '~{{remaining}}';
					}
					return key;
				};
			},
			getNode(id) {
				return nodesById.get(id);
			},
			registerType(name, ctor) {
				registered[name] = ctor;
			}
		},
		_registered: registered
	};

	const playSoundPackage = function mockPlaySoundPackage(opts) {
		if (options.playSoundOptsLog) {
			options.playSoundOptsLog.push(opts);
		}
		var resolvedPlayer = '';
		if (opts && opts.player) {
			resolvedPlayer = opts.player;
		} else if (opts && Array.isArray(opts.players) && opts.players.length) {
			resolvedPlayer = opts.players[0];
		}
		return {
			player: resolvedPlayer,
			play: function play(what, playOptions, next) {
				next = typeof playOptions === 'function' ? playOptions : next;
				return playImpl(what, next || function noop() {});
			}
		};
	};

	function mockMulter() {
		return {
			single: function single() {
				return function uploadNoop(req, res, cb) {
					req.file = null;
					cb(null);
				};
			}
		};
	}
	mockMulter.diskStorage = function diskStorage() {
		return {};
	};
	mockMulter.MulterError = class MulterError extends Error {
		constructor(message, code) {
			super(message);
			this.code = code || '';
		}
	};

	const playPath = path.resolve(__dirname, '..', '..', 'play.js');
	proxyquire(playPath, {
		'play-sound': playSoundPackage,
		multer: mockMulter,
		'./lib/available-players.js': mockAvailablePlayers,
		'./lib/audio-duration.js': async function mockDuration() {
			return audioDurationSeconds;
		}
	})(RED);

	if (!registered.playa) {
		throw new Error('Expected playa node to register');
	}

	return { RED, PlayaNode: registered.playa };
}

module.exports = {
	loadPlayWithMock
};
