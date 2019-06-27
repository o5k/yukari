const DB = require('./db.js');
const ConfigSanitizer = require('./sanitize-config.js');

let lastAudioBroadcast = null;

/* Broadcast a text message to an aura.
 * The aura must consist of: { type, shindo?, test?, scope? }
 * type may be 'nhk', 'nied', 'tsunami', or 'test'
 * shindo must be any of the allowed shindo values or 'unknown'
 * test, if truthy, will display a "THIS IS A TEST" warning
 * scope, if present, will send the broadcast only to that guild ID (for testing)
 */
function BroadcastText(client, aura, content) {
	const messages = [];

	if (aura.test) {
		content.embed.description = `:large_orange_diamond: **THIS IS A TEST - テストです** :large_orange_diamond:\n\n${content.embed.description}\n\n:large_orange_diamond: **THIS IS A TEST - テストです** :large_orange_diamond:`;
	}

	client.guilds.forEach((guild) => {
		if (aura.scope && (aura.scope !== guild.id)) {
			return;
		}

		DB.get(guild.id).then((opts) => {
			if (!opts.use_text) {
				return; // Guild has text messages off
			}

			switch (aura.type) {
			case 'tsunami':
				if (!opts.use_tsunami) {
					return; // Guild has tsunamis off
				}
				break;
			case 'nhk':
				if (!opts.use_nhk) {
					return; // Guild has NHK alerts off
				}
				break;
			case 'nied':
				if (!opts.use_nied) {
					return; // Guild has NIED alerts off
				}
				break;
			}

			let mentiontext = '';
			if (opts.mention === 'everyone') {
				mentiontext = '@everyone';
			}
			else if (opts.mention !== 'nobody') {
				mentiontext = `<@&${ opts.mention }>`;
			}

			if (['nhk', 'nied'].includes(aura.type)) {
				if (!ConfigSanitizer.shindos.includes(aura.shindo) && opts.ignore_unknown) {
					return; // Unknown shindo in a guild that doesn't want unknown shindos
				}
				else if (ConfigSanitizer.shindos.includes(aura.shindo)) {
					const wantedIndex = ConfigSanitizer.shindos.indexOf(opts.min_shindo);
					const givenIndex = ConfigSanitizer.shindos.indexOf(aura.shindo);

					if (givenIndex < wantedIndex) {
						return; // Shindo too low to be reported here
					}
				}
			}

			// OK, it can be reported now!
			// Get the guild's channel
			if (opts.alert_room === 'auto' || !guild.channels.has(opts.alert_room)) {
				// Auto (or the channel is missing)
				const syschan = guild.systemChannel || guild.channels.find(o => o.type === 'text');

				if (syschan) {
					syschan.send(mentiontext, content).then((m) => { messages.push(m); });
				}
			}
			else {
				// Manual
				guild.channels.get(opts.alert_room).send(mentiontext, content).then((m) => { messages.push(m); });
			}
		});
	});

	return {
		content,
		edit: function(content) {
			messages.forEach((m) => {
				m.edit(content);
			});
		},
	};
}

/* Broadcast an audio alert to an aura.
 * The aura must consist of: { type, shindo?, test?, scope? }
 * type may be 'nhk', 'nied', 'tsunami', or 'test'
 * shindo must be any of the allowed shindo values or 'unknown'
 * scope, if present, will send the broadcast only to that guild ID (for testing)
 */
const AudioBroadcastQueue = [];
function RequestBroadcastAudio(client, aura, soundPath, length, type) {
	AudioBroadcastQueue.push({
		client,
		aura,
		soundPath,
		length,
		type,
	});

	if (AudioBroadcastQueue.length === 1) {
		PopBroadcast();
	}
}

function PopBroadcast() {
	if (!AudioBroadcastQueue.length) {
		return;
	}

	const broadcast = AudioBroadcastQueue[0];
	BroadcastAudio(broadcast.client, broadcast.aura, broadcast.soundPath);
	setTimeout(() => {
		AudioBroadcastQueue.shift();
		PopBroadcast();
	}, broadcast.length);
}

function CullBroadcastsOfType(type) {
	if (AudioBroadcastQueue.length <= 1) {
		return;
	}

	for (let i = AudioBroadcastQueue.length - 1; i >= 1; i--) {
		if (AudioBroadcastQueue[i].type === type) {
			AudioBroadcastQueue.splice(i, 1);
		}
	}
}

function BroadcastAudio(client, aura, soundPath) {
	const broadcast = client.createVoiceBroadcast();
	setTimeout(() => {
		broadcast.playFile(soundPath);
	}, 1000);

	client.guilds.forEach((guild) => {
		if (aura.scope && (aura.scope !== guild.id)) {
			return;
		}

		DB.get(guild.id).then((opts) => {
			if (!opts.use_voice) {
				return; // Guild has text messages off
			}

			switch (aura.type) {
			case 'tsunami':
				if (!opts.use_tsunami) {
					return; // Guild has tsunamis off
				}
				break;
			case 'nhk':
				if (!opts.use_nhk) {
					return; // Guild has NHK alerts off
				}
				break;
			case 'nied':
				if (!opts.use_nied) {
					return; // Guild has NIED alerts off
				}
				break;
			}

			if (['nhk', 'nied'].includes(aura.type)) {
				if (!ConfigSanitizer.shindos.includes(aura.shindo) && opts.ignore_unknown) {
					return; // Unknown shindo in a guild that doesn't want unknown shindos
				}
				else if (ConfigSanitizer.shindos.includes(aura.shindo)) {
					const wantedIndex = ConfigSanitizer.shindos.indexOf(opts.min_shindo);
					const givenIndex = ConfigSanitizer.shindos.indexOf(aura.shindo);

					if (givenIndex < wantedIndex) {
						return; // Shindo too low to be reported here
					}
				}
			}

			// OK, it can be reported now!
			if (client.voiceConnections.has(guild.id) && client.voiceConnections.get(guild.id).status === 0) { // 0 = VoiceStatus.CONNECTED
				client.voiceConnections.get(guild.id).playBroadcast(broadcast);
				return;
			}

			// Get the guild's channel
			if (opts.alert_voice === 'auto' || !guild.channels.has(opts.alert_voice)) {
				// Auto (or the channel is missing)
				let syschannels = guild.channels.filter(o => o.type === 'voice');
				syschannels = syschannels.sort((a, b) => b.members.size - a.members.size);

				if (!syschannels.size) {
					return;
				}
				const syschan = syschannels.first();

				if (syschan && syschan.members.size) {
					syschan.join()
						.then((c) => { c.playBroadcast(broadcast); })
						.catch((err) => { console.log(err); });
				}
			}
			else {
				// Manual
				const chan = guild.channels.get(opts.alert_voice);
				if (chan && chan.members.size) {
					chan.join()
						.then((c) => { c.playBroadcast(broadcast); })
						.catch((err) => { console.log(err); });
				}
			}
		});
	});

	lastAudioBroadcast = Date.now();
}

/* Flush open connections. Used when no transmissions have been received, or when the bot starts.
 */
function FlushConnections(client) {
	client.voiceConnections.forEach((c) => {
		c.disconnect();
	});

	client.channels.forEach((ch) => {
		if (ch.type === 'voice') {
			ch.leave();
		}
	});

	client.guilds.forEach((g) => {
		const guser = g.members.get(client.user.id);
		if (guser) {
			guser.setVoiceChannel(null);
		}
	});
}

/* If no broadcasts have been made, flush the connections.
 */
function CheckFlush(client) {
	if (lastAudioBroadcast === null) {
		return;
	}

	if (Date.now() > (lastAudioBroadcast + 600000)) {
		FlushConnections(client);
		lastAudioBroadcast = null;
	}
}

module.exports = {
	BroadcastText,
	RequestBroadcastAudio,
	CullBroadcastsOfType,
	FlushConnections,
	CheckFlush,
};