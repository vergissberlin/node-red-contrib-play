'use strict';

const path = require('path');
const fs = require('fs');
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('events');
const { loadPlayWithMock } = require('./helpers/load-play-node');

const FIXTURE_WAV = path.join(__dirname, '..', 'examples', 'sounds', 'beep.wav');

describe('playa node', () => {
	if (!fs.existsSync(FIXTURE_WAV)) {
		throw new Error('Missing test fixture: ' + FIXTURE_WAV);
	}
	it('registers type playa on RED', () => {
		const playImpl = () => ({ kill: () => {} });
		const { RED } = loadPlayWithMock(playImpl);
		assert.strictEqual(typeof RED._registered.playa, 'function');
	});

	it('calls play with msg.payload, sends immediately, and does not kill the new playback', async () => {
		const events = [];
		const playImpl = (path, cb) => {
			events.push({ op: 'play', path, cb });
			setImmediate(() => {
				cb(null);
			});
			return {
				kill: () => events.push({ op: 'kill', path })
			};
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'alarm', id: 'n-play-1' });
		const msg = { payload: FIXTURE_WAV };
		node.emit('input', msg);

		assert.strictEqual(events.length, 1);
		assert.deepStrictEqual(events[0], {
			op: 'play',
			path: FIXTURE_WAV,
			cb: events[0].cb
		});
		assert.strictEqual(node._sent, msg);
		assert.strictEqual(node._err, undefined);
		assert.deepStrictEqual(node._statusLog, [{ fill: 'blue', shape: 'dot' }]);
		await new Promise((r) => setImmediate(r));
		assert.deepStrictEqual(node._statusLog, [
			{ fill: 'blue', shape: 'dot' },
			{}
		]);
	});

	it('kills previous playback when stopPrevious is true and a new message arrives', () => {
		const events = [];
		const playImpl = (path, cb) => {
			events.push({ op: 'play', path });
			setImmediate(() => cb(null));
			return {
				kill: () => events.push({ op: 'kill', path })
			};
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-overlap', stopPrevious: true });
		node.emit('input', { payload: FIXTURE_WAV });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.deepStrictEqual(events, [
			{ op: 'play', path: FIXTURE_WAV },
			{ op: 'kill', path: FIXTURE_WAV },
			{ op: 'play', path: FIXTURE_WAV }
		]);
	});

	it('does not kill previous playback when stopPrevious is false', () => {
		const events = [];
		const playImpl = (path, cb) => {
			events.push({ op: 'play', path });
			setImmediate(() => cb(null));
			return {
				kill: () => events.push({ op: 'kill', path })
			};
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-no-stop', stopPrevious: false });
		node.emit('input', { payload: FIXTURE_WAV });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.deepStrictEqual(events, [
			{ op: 'play', path: FIXTURE_WAV },
			{ op: 'play', path: FIXTURE_WAV }
		]);
	});

	it('defers send until playback ends when sendOnEnd is true', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(null));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'a', id: 'n-send-end', sendOnEnd: true });
		const msg = { payload: FIXTURE_WAV };
		node.emit('input', msg);
		assert.strictEqual(node._sent, undefined);
		await new Promise((r) => setImmediate(r));
		assert.strictEqual(node._sent, msg);
	});

	it('does not send when sendOnEnd is true and play fails synchronously', () => {
		const playImpl = (path, cb) => {
			cb(new Error('fail'));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-no-send-err', sendOnEnd: true });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.strictEqual(node._sent, undefined);
		assert.ok(node._err instanceof Error);
	});

	it('errors before play when sound file does not exist', () => {
		let playCalls = 0;
		const playImpl = () => {
			playCalls++;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-missing' });
		node.emit('input', { payload: '/nonexistent-sound-90210.wav' });
		assert.strictEqual(playCalls, 0);
		assert.ok(node._err instanceof Error);
		assert.match(node._err.message, /not found/i);
	});

	it('uses configured node name when payload is missing', () => {
		let playedPath;
		const playImpl = (path) => {
			playedPath = path;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: FIXTURE_WAV, id: 'n2' });
		node.emit('input', {});
		assert.strictEqual(playedPath, FIXTURE_WAV);
		assert.strictEqual(node._sent.payload, undefined);
	});

	it('prefers soundPath over node name when payload is missing', () => {
		let playedPath;
		const playImpl = (path) => {
			playedPath = path;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({
			name: 'fallback-label',
			soundPath: FIXTURE_WAV,
			id: 'n-soundpath'
		});
		node.emit('input', {});
		assert.strictEqual(playedPath, FIXTURE_WAV);
	});

	it('uses node name when payload is empty string (falsy)', () => {
		let playedPath;
		const playImpl = (path) => {
			playedPath = path;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: FIXTURE_WAV, id: 'n3' });
		node.emit('input', { payload: '' });
		assert.strictEqual(playedPath, FIXTURE_WAV);
	});

	it('formats non-zero exit code with player and path in the error message', () => {
		const playImpl = (path, cb) => {
			cb(1);
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-exit-code', player: '' });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.ok(node._err instanceof Error);
		assert.match(node._err.message, /exited with code 1/);
		assert.ok(node._err.message.includes(FIXTURE_WAV));
	});

	it('reports error via node.error when play callback receives an error', () => {
		const playImpl = (path, cb) => {
			cb(new Error('player failed'));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n4' });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.ok(node._err instanceof Error);
		assert.strictEqual(node._err.message, 'player failed');
		assert.strictEqual(node._sent.payload, FIXTURE_WAV);
		assert.deepStrictEqual(node._statusLog, [
			{ fill: 'blue', shape: 'dot' },
			{ fill: 'red', shape: 'dot', text: 'player failed' }
		]);
	});

	it('handles child error event (e.g. spawn ENOENT) via node.error', async () => {
		const playImpl = () => {
			const child = new EventEmitter();
			child.kill = () => {};
			setImmediate(() => {
				child.emit('error', new Error('spawn mplayer ENOENT'));
			});
			return child;
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-spawn-enoent' });
		node.emit('input', { payload: FIXTURE_WAV });
		await new Promise((r) => setImmediate(r));
		assert.ok(node._err instanceof Error);
		assert.strictEqual(node._err.message, 'spawn mplayer ENOENT');
		assert.strictEqual(node._statusLog[1].text, 'spawn mplayer ENOENT'.slice(0, 20));
	});

	it('reports async play errors on node.error', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(new Error('async fail')));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n5' });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.strictEqual(node._err, undefined);
		assert.deepStrictEqual(node._statusLog, [{ fill: 'blue', shape: 'dot' }]);
		await new Promise((r) => setImmediate(r));
		assert.ok(node._err instanceof Error);
		assert.strictEqual(node._err.message, 'async fail');
		assert.deepStrictEqual(node._statusLog, [
			{ fill: 'blue', shape: 'dot' },
			{ fill: 'red', shape: 'dot', text: 'async fail' }
		]);
	});

	it('truncates status error text to 20 characters', () => {
		const longMsg = 'x'.repeat(40);
		const playImpl = (path, cb) => {
			cb(new Error(longMsg));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-status-trunc' });
		node.emit('input', { payload: FIXTURE_WAV });
		assert.strictEqual(node._statusLog[1].text, longMsg.slice(0, 20));
	});

	it('clears status on node close', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(null));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-close' });
		node.emit('input', { payload: FIXTURE_WAV });
		await new Promise((r) => setImmediate(r));
		assert.deepStrictEqual(node._statusLog.slice(-1)[0], {});
		node.emit('close');
		assert.deepStrictEqual(node._statusLog.slice(-1)[0], {});
		assert.strictEqual(node._statusLog.length, 3);
	});

	it('passes explicit player to play-sound factory', () => {
		const playImpl = () => ({ kill: () => {} });
		const optsLog = [];
		const { PlayaNode } = loadPlayWithMock(playImpl, { playSoundOptsLog: optsLog });
		new PlayaNode({ name: 'x', id: 'n-player-explicit', player: 'afplay' });
		assert.strictEqual(optsLog.length, 1);
		assert.strictEqual(optsLog[0].player, 'afplay');
		assert.strictEqual(optsLog[0].players, undefined);
	});

	it('shows remaining duration in status when metadata duration is available', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(null));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl, { audioDurationSeconds: 125 });
		const node = new PlayaNode({ name: 'x', id: 'n-remaining' });
		node.emit('input', { payload: FIXTURE_WAV });
		await new Promise((r) => setImmediate(r));
		await new Promise((r) => setImmediate(r));
		// First tick uses Date.now() twice; ≥1 ms between calls floors 125 s to 2:04, not 2:05.
		const hasRemaining = node._statusLog.some(function (s) {
			return s && s.text && /2:0[4-5]/.test(String(s.text));
		});
		assert.ok(hasRemaining, 'expected status text with remaining time (e.g. ~2:05 or ~2:04)');
	});

	it('passes platform players list to play-sound when player is empty', () => {
		const playImpl = () => ({ kill: () => {} });
		const optsLog = [];
		const { PlayaNode } = loadPlayWithMock(playImpl, { playSoundOptsLog: optsLog });
		new PlayaNode({ name: 'x', id: 'n-player-auto', player: '' });
		assert.strictEqual(optsLog.length, 1);
		assert.strictEqual(optsLog[0].player, undefined);
		assert.ok(Array.isArray(optsLog[0].players));
		assert.ok(optsLog[0].players.length > 0);
	});

	it('stop admin route kills current playback for the node id', () => {
		const events = [];
		const playImpl = (path, cb) => {
			events.push({ op: 'play', path });
			return {
				kill: () => events.push({ op: 'kill', path })
			};
		};
		const { RED, PlayaNode } = loadPlayWithMock(playImpl);
		new PlayaNode({ name: 'x', id: 'n-stop-route' });
		const node = RED.nodes.getNode('n-stop-route');
		node.emit('input', { payload: FIXTURE_WAV });
		assert.deepStrictEqual(events, [{ op: 'play', path: FIXTURE_WAV }]);

		const stopHandler = RED._postHandlers.find((h) => h.route === '/contrib-playa/stop/:id');
		assert.ok(stopHandler, 'expected POST /contrib-playa/stop/:id to be registered');
		const res = {
			statusCode: 200,
			body: null,
			status(code) {
				this.statusCode = code;
				return this;
			},
			json(data) {
				this.body = data;
			}
		};
		stopHandler.handler({ params: { id: 'n-stop-route' } }, res);
		assert.strictEqual(res.statusCode, 200);
		assert.deepStrictEqual(res.body, { ok: true });
		assert.deepStrictEqual(events, [
			{ op: 'play', path: FIXTURE_WAV },
			{ op: 'kill', path: FIXTURE_WAV }
		]);
	});

	it('stop admin route returns 404 when node id is unknown', () => {
		const playImpl = () => ({ kill: () => {} });
		const { RED } = loadPlayWithMock(playImpl);
		const stopHandler = RED._postHandlers.find((h) => h.route === '/contrib-playa/stop/:id');
		const res = {
			statusCode: 200,
			body: null,
			status(code) {
				this.statusCode = code;
				return this;
			},
			json(data) {
				this.body = data;
			}
		};
		stopHandler.handler({ params: { id: 'n-missing' } }, res);
		assert.strictEqual(res.statusCode, 404);
		assert.deepStrictEqual(res.body, { error: 'Node not found' });
	});
});
