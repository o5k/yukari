const boolShorthand = function(value) {
	switch (value.toLowerCase()) {
	case 'true':
		return { err: null, value: true };
	case 'false':
		return { err: null, value: false };
	default:
		return { err: 'Value must be `true` or `false`.', value: null };
	}
};

const ConfigSanitizer = {
	keys: [ 'use_nhk', 'use_nied', 'use_tsunami', 'min_shindo', 'ignore_unknown', 'use_text', 'alert_room', 'use_voice', 'alert_voice', 'admin_only', 'mention' ],
	shindos: [ '1', '2', '3', '4', '5-', '5+', '6-', '6+', '7' ],
	use_nhk: boolShorthand,
	use_nied: boolShorthand,
	use_tsunami: boolShorthand,
	min_shindo: function(value) {
		if (this.shindos.includes(value)) {
			return { err: null, value };
		}
		else {
			return { err: 'Value must be one of: `1`, `2`, `3`, `4`, `5-`, `5+`, `6-`, `6+`, `7`.', value: null };
		}
	},
	ignore_unknown: boolShorthand,
	use_text: boolShorthand,
	alert_room: function(value, context) {
		if (value === 'auto') {
			return { err: null, value };
		}
		else {
			const channel = context.channels.get(value);
			if (channel === undefined) {
				return { err: 'No channel was found with this channel ID. Value must be `auto` or a channel ID (turn on developer options and right-click a channel).', value: null };
			}

			if (!['text', 'news'].includes(channel.type)) {
				return { err: 'This channel isn\'t a text channel.', value: null };
			}

			return { err: null, value };
		}
	},
	use_voice: boolShorthand,
	alert_voice: function(value, context) {
		if (value === 'auto') {
			return { err: null, value };
		}
		else {
			const channel = context.channels.get(value);
			if (channel === undefined) {
				return { err: 'No channel was found with this channel ID. Value must be `auto` or a channel ID (turn on developer options and right-click a channel).', value: null };
			}

			if (channel.type !== 'voice') {
				return { err: 'This channel isn\'t a voice channel.', value: null };
			}

			return { err: null, value };
		}
	},
	admin_only: boolShorthand,
	mention: function(value, context) {
		if (value === 'nobody' || value === 'everyone') {
			return { err: null, value };
		}
		else {
			const role = context.roles.get(value);
			if (role === undefined) {
				return { err: 'No role was found with this role ID. Value must be `nobody`, `everybody` or a role ID (turn on developer options and right-click a role in Server Settings).', value: null };
			}

			if (!role.mentionable) {
				return { err: 'This role is not mentionable, so setting Yukari to ping it would be useless.', value: null };
			}

			return { err: null, value };
		}
	},
	ShindoTrans: function(text) {
		return text.toString().replace('強', '+').replace('弱', '-').replace('不明', '');
	},
	ShindoUnTrans: function(text) {
		return text.toString().replace('+', '強').replace('-', '弱');
	},
};

module.exports = ConfigSanitizer;
