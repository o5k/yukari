const CONFIG = require('./config.json');
const Monitor = require('./monitor.js');
const DB = require('./db.js');
const ConfigSanitizer = require('./sanitize-config.js');
const CreateNIEDChart = require('./nied-chart.js');
const Yukari = require('./yukari.js');
const Discord = require('discord.js');
const client = new Discord.Client();
const Git = require('nodegit');
const Broadcaster = require('./broadcaster.js');

client.once('ready', () => {
	let commandCount = 0;
	let eventCount = 0;

	DB.init();
	client.user.setPresence({ game: { name: CONFIG.presence.game, type: CONFIG.presence.action }, status: 'online' });
	Broadcaster.FlushConnections(client);

	console.log('Yukari started.');

	Monitor.on('nhk', (d, scope, test) => {
		const areas = [];

		d.groups.forEach((group) => {
			const area = {
				name: CONFIG.emojiMap[group.shindo],
				value: group.areas.join('\n'),
				inline: true,
			};

			areas.push(area);
		});

		Broadcaster.BroadcastText(client, {
			type: 'nhk',
			shindo: d.max_shindo,
			scope,
			test,
		}, {
			embed: {
				author: {
					name: 'NHK earthquake report - NHKの地震速報',
					url: 'https://www.nhk.or.jp/kishou-saigai/earthquake/',
					icon_url: CONFIG.messageIcons.low,
				},
				description: `Magnitude - マグニチュード: **${d.magnitude || 'unknown/不明'}**\nMaximum intensity - 最大震度: ${CONFIG.emojiMap[d.max_shindo] || 'unknown/不明'}\nDepth - 深さ: **${d.depth || 'unknown/不明'}**\nEpicenter - 震源地: **${d.epicenter || 'unknown/不明'}**`,
				color: 16759296,
				footer: {
					text: d.time,
				},
				image: {
					url: d.image_url,
				},
				fields: areas,
			},
		});

		Broadcaster.RequestBroadcastAudio(client, { type: 'nhk', shindo: d.max_shindo, scope }, 'assets/nhk.mp3', 5000, 'sfx');
		Yukari('新しいNHKの地震速報を受け取りました。', (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nhk', shindo: d.max_shindo, scope }, yukariPath, 5000, 'intro');
		}, 4000);
		Yukari(`最大震度は${ConfigSanitizer.ShindoUnTrans(d.max_shindo || '不明')}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nhk', shindo: d.max_shindo, scope }, yukariPath, 3500, 'shindo');
		}, 9000);
		Yukari(`マグニチュードは${d.magnitude || '不明'}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nhk', shindo: d.max_shindo, scope }, yukariPath, 3500, 'magnitude');
		}, 12000);
		Yukari(`震源地は${d.epicenter || '不明'}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nhk', shindo: d.max_shindo, scope }, yukariPath, 4000, 'epicenter');
		}, 15000);

		eventCount++;
	});

	Monitor.on('nied_start', (d, scope, test) => {
		const broadcast = Broadcaster.BroadcastText(client, {
			type: 'nied',
			shindo: ConfigSanitizer.ShindoTrans(d.max_shindo),
			scope,
			test,
		}, {
			embed: {
				author: {
					name: 'NIED early earthquake warning - 緊急地震速報',
					url: 'http://www.kmoni.bosai.go.jp/',
					icon_url: CONFIG.messageIcons.medium,
				},
				description: `Magnitude - マグニチュード: **${d.magnitude || 'unknown/不明'}**\nMaximum intensity - 最大震度: ${CONFIG.emojiMap[ConfigSanitizer.ShindoTrans(d.max_shindo)] || 'unknown/不明'}\nDepth - 深さ: **${d.depth || 'unknown/不明'}**\nEpicenter - 震源地: **${d.epicenter || 'unknown/不明'}**`,
				color: 16727040,
			},
		});

		CreateNIEDChart((o) => {
			broadcast.content.embed.image = {
				url: o,
			};
			broadcast.edit(broadcast.content);
		}, () => {});

		Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo), scope }, 'assets/nied_start.mp3', 4500, 'sfx');
		Yukari('緊急地震速報です。強い揺れに警戒して下さい。', (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo), scope }, yukariPath, 6000, 'intro');
		}, 4000);
		Yukari(`最大震度は${d.max_shindo || '不明'}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo), scope }, yukariPath, 3500, 'shindo');
		}, 10000);
		Yukari(`マグニチュードは${d.magnitude || '不明'}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo), scope }, yukariPath, 3500, 'magnitude');
		}, 13000);
		Yukari(`震源地は${d.epicenter || '不明'}です。`, (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo), scope }, yukariPath, 4500, 'epicenter');
		}, 16000);

		eventCount++;
	});

	Monitor.on('nied_continue', (d, scope, test) => {
		const broadcast = Broadcaster.BroadcastText(client, {
			type: 'nied',
			shindo: ConfigSanitizer.ShindoTrans(d.max_shindo.new),
			scope,
			test,
		}, {
			embed: {
				author: {
					name: `Update #${d.update_num}`,
				},
				description: `Magnitude - マグニチュード: ${d.magnitude.new !== d.magnitude.old ? `${d.magnitude.old || 'unknown/不明'} → **${d.magnitude.new || 'unknown/不明'}**` : `${d.magnitude.new || 'unknown/不明'}`}\nMaximum intensity - 最大震度: ${d.max_shindo.new !== d.max_shindo.old ? `${CONFIG.emojiMap[ConfigSanitizer.ShindoTrans(d.max_shindo.old)] || 'unknown/不明'} → ${CONFIG.emojiMap[ConfigSanitizer.ShindoTrans(d.max_shindo.new)] || 'unknown/不明'}` : `${CONFIG.emojiMap[ConfigSanitizer.ShindoTrans(d.max_shindo.new)] || 'unknown/不明'}`}\nDepth - 深さ: ${d.depth.new !== d.depth.old ? `${d.depth.old || 'unknown/不明'} → **${d.depth.new || 'unknown/不明'}**` : `${d.depth.new || 'unknown/不明'}`}\nEpicenter - 震源地: ${d.epicenter.new !== d.epicenter.old ? `${d.epicenter.old || 'unknown/不明'} → **${d.epicenter.new || 'unknown/不明'}**` : `${d.epicenter.new || 'unknown/不明'}`}`,
				color: 16740864,
			},
		});

		CreateNIEDChart((o) => {
			broadcast.content.embed.image = {
				url: o,
			};
			broadcast.edit(broadcast.content);
		}, () => {});

		const prevIndex = ConfigSanitizer.shindos.indexOf(ConfigSanitizer.ShindoTrans(d.max_shindo.old));
		const currentIndex = ConfigSanitizer.shindos.indexOf(ConfigSanitizer.ShindoTrans(d.max_shindo.new));
		if (currentIndex > prevIndex) {
			Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo.new), scope }, 'assets/nied_rise.mp3', 2500, 'sfx');
			Yukari(`最大震度は${d.max_shindo.new || '不明'}です。`, (yukariPath) => {
				Broadcaster.CullBroadcastsOfType('shindo');
				Broadcaster.RequestBroadcastAudio(client, { type: 'nied', shindo: ConfigSanitizer.ShindoTrans(d.max_shindo.new), scope }, yukariPath, 3500, 'shindo');
			}, 2000);
		}

		eventCount++;
	});

	Monitor.on('tsunami', (d, scope, test) => {
		Broadcaster.BroadcastText(client, {
			type: 'tsunami',
			scope,
			test,
		}, {
			embed: {
				author: {
					name: 'TSUNAMI ALERT ISSUED - 津波警報',
					url: 'https://www.nhk.or.jp/kishou-saigai/tsunami/',
					icon_url: CONFIG.messageIcons.high,
				},
				description: 'FOR MORE INFORMATION PLEASE SEE OFFICIAL SOURCES: [JMA](https://www.jma.go.jp/jp/tsunami/) [NHK](https://www.nhk.or.jp/kishou-saigai/tsunami/)',
				color: 16711716,
				image: {
					url: d.image_url,
				},
			},
		});

		Broadcaster.RequestBroadcastAudio(client, { type: 'tsunami', scope }, 'assets/tsunami.mp3', 8500, 'sfx');
		Yukari('津波警報です！津波警報です！すぐ逃げて下さい！', (yukariPath) => {
			Broadcaster.RequestBroadcastAudio(client, { type: 'tsunami', scope }, yukariPath, 6000, 'intro');
		}, 8000);

		eventCount++;
	});

	client.on('message', (message) => {
		if (!message.content.startsWith(CONFIG.prefix) || message.author.bot) {
			return;
		}
		if (!message.guild.available) {
			return;
		}
		const gmember = message.guild.member(message.author);
		if (!gmember) {
			return;
		}

		const args = message.content.slice(CONFIG.prefix.length).split(/ +/);
		const command = args.shift().toLowerCase();

		commandCount++;
		console.log(`-> ${ message.guild.name } -> ${ message.author.username }#${ message.author.discriminator } -> ${ message.channel.name || 'unnamed?' }: ${ message.content }`);

		switch (command) {
		case 'config':
			if (!gmember.permissions.has('ADMINISTRATOR')) {
				return;
			}

			if (args.length === 2) {
				if (!ConfigSanitizer.keys.includes(args[0])) {
					message.reply(':x: **Error updating config:** this key does not exist. Usage: `config key value`');
				}
				else {
					const sanitized = ConfigSanitizer[args[0]](args[1], message.guild);

					if (sanitized.err) {
						message.reply(`:x: **Error updating config:** ${sanitized.err}`);
					}
					else {
						DB.set(message.guild.id, args[0], sanitized.value).then(() => {
							message.reply(':white_check_mark: **Configuration updated.**');
						});
					}
				}
			}
			else {
				DB.get(message.guild.id).then((opts) => {
					let outputstring = '';

					ConfigSanitizer.keys.forEach((key) => {
						outputstring += `\`${key}\`: **${opts[key]}**\n`;
					});

					message.channel.send('', {
						embed: {
							title: `Configuration for _${message.guild.name}_`,
							description: outputstring,
						},
					});
				});
			}
			break;
		case 'nied':
			DB.get(message.guild.id).then((opts) => {
				if (opts.admin_only && !gmember.permissions.has('ADMINISTRATOR')) {
					return;
				}

				CreateNIEDChart((o) => {
					message.channel.send('', {
						embed: {
							title: 'NIED graph',
							image: {
								url: o,
							},
						},
					});
				}, () => {
					message.reply(':x: **Error obtaining NIED graph**');
				});
			});
			break;
		case 'ping':
			DB.get(message.guild.id).then((opts) => {
				if (opts.admin_only && !gmember.permissions.has('ADMINISTRATOR')) {
					return;
				}

				const dn = Date.now();
				const pings = Monitor.pings();
				message.channel.send('', {
					embed: {
						title: 'Pong!',
						description: `Last NHK ping: ${ dn - pings.nhk }ms ago\nLast NIED ping: ${ dn - pings.nied }ms ago\nLast tsunami alert ping: ${ dn - pings.tsunami }ms ago`,
					},
				});
			});
			break;
		case 'stats':
			DB.get(message.guild.id).then((opts) => {
				if (opts.admin_only && !gmember.permissions.has('ADMINISTRATOR')) {
					return;
				}

				Git.Repository.open(process.cwd()).then((repo) => {
					return repo.getHeadCommit();
				}).then((commit) => {
					message.channel.send('', {
						embed: {
							title: 'Yukari by osk',
							description: `Last commit: [${ commit.sha().substring(0, 7) }] _${ commit.message() }_ by **${ commit.author().name() }**\nGuilds: **${ client.guilds.size }**\nConnections: **${ client.voiceConnections.size }**\nReceived commands this session: **${ commandCount }**\nReceived events this session: **${ eventCount }**`,
						},
					});
				});
			});
			break;
		case 'test':
			if (!gmember.permissions.has('ADMINISTRATOR')) {
				return;
			}

			if (args.length < 2) {
				message.reply(':x: **Error starting test:** not enough arguments. Usage: `test local|global type [shindo]`');
				return;
			}
			if (args[0] === 'global' && (!CONFIG.botmasters.includes(message.author.id))) {
				message.reply(':x: **Error starting test:** you do not have permission to start a global test');
				return;
			}
			if (!['global', 'local'].includes(args[0])) {
				message.reply(':x: **Error starting test:** unknown scope. Usage: `test local|global type [shindo]`');
				return;
			}
			if (args[1] === 'displayrun') {
				Monitor.displayRun(args[0] === 'global' ? null : message.guild.id);
				setTimeout(() => {
					Broadcaster.BroadcastText(client, {
						type: 'test',
						scope: args[0] === 'global' ? null : message.guild.id,
					}, {
						embed: {
							description: 'Test completed.\nテストは完了しました。',
							color: 8453960,
						},
					});
					Broadcaster.RequestBroadcastAudio(client, { type: 'test', scope: args[0] === 'global' ? null : message.guild.id }, 'assets/test.mp3', 2500, 'sfx');
					Yukari('テストは完了しました。', (yukariPath) => {
						Broadcaster.RequestBroadcastAudio(client, { type: 'test', scope: args[0] === 'global' ? null : message.guild.id }, yukariPath, 3500, 'intro');
					}, 2000);
				}, 75000);
			}
			else {
				if (!Monitor.allowedTypes.includes(args[1])) {
					message.reply(':x: **Error starting test:** unknown test type');
					return;
				}
				let shindo = '7';
				if (args.length >= 3) {
					shindo = args[2];

					if (!ConfigSanitizer.shindos.includes(shindo) && shindo !== 'unknown') {
						message.reply(':x: **Error starting test:** unknown shindo');
						return;
					}
					if (shindo === 'unknown') {
						shindo = '';
					}
				}

				Monitor.test(args[1], args[0] === 'global' ? null : message.guild.id, shindo);
			}
			break;
		case 'broadcast':
			if (!gmember.permissions.has('ADMINISTRATOR')) {
				return;
			}

			if (args.length < 2) {
				message.reply(':x: **Error starting broadcast:** not enough arguments. Usage: `broadcast local|global message`');
				return;
			}
			if (args[0] === 'global' && (!CONFIG.botmasters.includes(message.author.id))) {
				message.reply(':x: **Error starting broadcast:** you do not have permission to start a global broadcast');
				return;
			}
			if (!['global', 'local'].includes(args[0])) {
				message.reply(':x: **Error starting broadcast:** unknown scope. Usage: `broadcast local|global message`');
				return;
			}
			Broadcaster.BroadcastText(client, {
				type: 'test',
				scope: args[0] === 'global' ? null : message.guild.id,
			}, {
				embed: {
					description: args.slice(1).join(' '),
					color: 8453960,
				},
			});
			Broadcaster.RequestBroadcastAudio(client, { type: 'test', scope: args[0] === 'global' ? null : message.guild.id }, 'assets/test.mp3', 2500, 'sfx');
			Yukari(args.slice(1).join(' '), (yukariPath) => {
				Broadcaster.RequestBroadcastAudio(client, { type: 'test', scope: args[0] === 'global' ? null : message.guild.id }, yukariPath, 3500, 'intro');
			}, 2000);
			break;
		default:
			break;
		}
	});

	client.on('guildCreate', (guild) => {
		console.log(`Joined new guild ${ guild.name }!`);
	});
	client.on('guildDelete', (guild) => {
		console.log(`Removed from guild ${ guild.name }!`);
	});

	setInterval(() => {
		Broadcaster.CheckFlush(client);
		console.log(`${ client.guilds.size } guilds - ${ client.voiceConnections.size } connections`);
	}, 10000);
});

client.login(CONFIG.token);
