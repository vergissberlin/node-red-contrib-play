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

	it('calls play with msg.payload, invokes kill, and sends the same message', () => {
		const events = [];
		const playImpl = (path, cb) => {
			events.push({ op: 'play', path, cb });
			return {
				kill: () => events.push({ op: 'kill', path })
			};
		};
		const { PlayaNode } = loadPlayWithMock(playImpl);
		const node = new PlayaNode({ name: 'alarm', id: 'n-play-1' });
		const msg = { payload: '/tmp/beep.wav' };
		node.emit('input', msg);

		assert.strictEqual(events.length, 2);
		assert.deepStrictEqual(events[0], {
			op: 'play',
			path: '/tmp/beep.wav',
			cb: events[0].cb
		});
		assert.deepStrictEqual(events[1], { op: 'kill', path: '/tmp/beep.wav' });
		assert.strictEqual(node._sent, msg);
		assert.strictEqual(node._err, undefined);
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
		await new Promise((r) => setImmediate(r));
		assert.ok(node._err instanceof Error);
		assert.strictEqual(node._err.message, 'async fail');
	});
});
