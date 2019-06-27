const Sequelize = require('sequelize');

const DB = (() => {
	const sequelize = new Sequelize('yukariopts', 'yukari', 'yukari', {
		host: 'localhost',
		dialect: 'sqlite',
		logging: false,
		storage: 'db.sqlite',
	});

	const GuildOpts = sequelize.define('tags', {
		guild: {
			type: Sequelize.STRING,
			unique: true,
		},
		use_nhk: Sequelize.BOOLEAN,
		use_nied: Sequelize.BOOLEAN,
		use_tsunami: Sequelize.BOOLEAN,
		min_shindo: Sequelize.STRING,
		ignore_unknown: Sequelize.BOOLEAN,
		use_text: Sequelize.BOOLEAN,
		alert_room: Sequelize.STRING,
		use_voice: Sequelize.BOOLEAN,
		alert_voice: Sequelize.STRING,
		admin_only: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
		mention: {
			type: Sequelize.STRING,
			defaultValue: 'nobody',
		},
	});

	// publics
	return {
		init: function() {
			GuildOpts.sync();
		},
		get: async function(guild) {
			const data = await GuildOpts.findOne({ where: { guild } });

			if (data) {
				return data;
			}

			// Guild wasn't yet indexed, so we need to make a new one
			const newdata = await GuildOpts.create({
				guild,
				use_nhk: true,
				use_nied: true,
				use_tsunami: true,
				min_shindo: '3',
				ignore_unknown: false,
				use_text: true,
				alert_room: 'auto',
				use_voice: true,
				alert_voice: 'auto',
				admin_only: true,
				mention: 'nobody',
			});
			return newdata;
		},
		set: async function(guild, key, value) {
			const updator = {};
			updator[key] = value;

			const affectedRows = await GuildOpts.update(updator, { where: { guild } });

			if (affectedRows > 0) {
				return;
			}

			// Guild wasn't yet indexed, so we need to make a new one
			const creator = {
				guild,
				use_nhk: true,
				use_nied: true,
				use_tsunami: true,
				min_shindo: '3',
				ignore_unknown: false,
				use_text: true,
				alert_room: 'auto',
				use_voice: true,
				alert_voice: 'auto',
				admin_only: true,
				mention: 'nobody',
			};
			creator[key] = value;

			await GuildOpts.create(creator);
			return;
		},
	};
})();

module.exports = DB;
