'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadPlayWithMock } = require('./helpers/load-play-node');

describe('playa node', () => {
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
		const msg = { payload: '/tmp/beep.wav' };
		node.emit('input', msg);

		assert.strictEqual(events.length, 1);
		assert.deepStrictEqual(events[0], {
			op: 'play',
			path: '/tmp/beep.wav',
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
		node.emit('input', { payload: '/a.wav' });
		node.emit('input', { payload: '/b.wav' });
		assert.deepStrictEqual(events, [
			{ op: 'play', path: '/a.wav' },
			{ op: 'kill', path: '/a.wav' },
			{ op: 'play', path: '/b.wav' }
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
		node.emit('input', { payload: '/a.wav' });
		node.emit('input', { payload: '/b.wav' });
		assert.deepStrictEqual(events, [
			{ op: 'play', path: '/a.wav' },
			{ op: 'play', path: '/b.wav' }
		]);
	});

	it('defers send until playback ends when sendOnEnd is true', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(null));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'a', id: 'n-send-end', sendOnEnd: true });
		const msg = { payload: '/x.wav' };
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
		node.emit('input', { payload: '/x.wav' });
		assert.strictEqual(node._sent, undefined);
		assert.ok(node._err instanceof Error);
	});

	it('uses configured node name when payload is missing', () => {
		let playedPath;
		const playImpl = (path) => {
			playedPath = path;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'default-sound', id: 'n2' });
		node.emit('input', {});
		assert.strictEqual(playedPath, 'default-sound');
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
			soundPath: '/data/uploads/beep.wav',
			id: 'n-soundpath'
		});
		node.emit('input', {});
		assert.strictEqual(playedPath, '/data/uploads/beep.wav');
	});

	it('uses node name when payload is empty string (falsy)', () => {
		let playedPath;
		const playImpl = (path) => {
			playedPath = path;
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'fallback', id: 'n3' });
		node.emit('input', { payload: '' });
		assert.strictEqual(playedPath, 'fallback');
	});

	it('reports error via node.error when play callback receives an error', () => {
		const playImpl = (path, cb) => {
			cb(new Error('player failed'));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n4' });
		node.emit('input', { payload: '/x.wav' });
		assert.ok(node._err instanceof Error);
		assert.strictEqual(node._err.message, 'player failed');
		assert.strictEqual(node._sent.payload, '/x.wav');
		assert.deepStrictEqual(node._statusLog, [
			{ fill: 'blue', shape: 'dot' },
			{ fill: 'red', shape: 'dot', text: 'player failed' }
		]);
	});

	it('reports async play errors on node.error', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(new Error('async fail')));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n5' });
		node.emit('input', { payload: '/y.wav' });
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
		node.emit('input', { payload: '/x.wav' });
		assert.strictEqual(node._statusLog[1].text, longMsg.slice(0, 20));
	});

	it('clears status on node close', async () => {
		const playImpl = (path, cb) => {
			setImmediate(() => cb(null));
			return { kill: () => {} };
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'x', id: 'n-close' });
		node.emit('input', { payload: '/z.wav' });
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
});
