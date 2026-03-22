/**
 * Loads play.js with a mocked play-sound package and a minimal RED runtime stub.
 */
'use strict';

const path = require('path');
const { EventEmitter } = require('events');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/**
 * @param {function(string, function(Error|null): void): { kill?: function(): void }} playImpl
 *        Implementation for the play-sound instance’s `.play(what, options?, next?)` behaviour.
 * @param {{ playSoundOptsLog?: object[] }} [options]
 * @returns {{ RED: object, PlayaNode: function(object): import('events').EventEmitter }}
 */
function loadPlayWithMock(playImpl, options) {
	if (!options) {
		options = {};
	}
	const registered = {};
	const RED = {
		settings: {
			userDir: '/tmp/node-red-test-userdir'
		},
		httpAdmin: {
			post: function post() {
				// Upload route registration; no-op for unit tests.
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
				node._ = function _(key, params) {
					if (key === 'playa.status.remaining' && params && params.remaining != null) {
						return '~' + params.remaining;
					}
					return key;
				};
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
		'music-metadata': {
			parseFile: async function parseFileMock() {
				return { format: { duration: null } };
			}
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
