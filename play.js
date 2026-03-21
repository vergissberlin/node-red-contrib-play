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

	var player = require('play-sound')({});

	/**
	 * Player options
	 *
	 * @property {*} config Configuration object
	 */
	function PlayaNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;

		this.on('input', function(msg) {
			var audio = player.play(
				msg.payload || this.name,
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
