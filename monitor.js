const request = require('request');
const parseString = require('xml2js').parseString;
const encoding = require('encoding');

const Monitor = (() => {
	let lastNHKCheck = null;
	let lastNIEDCheck = null;
	let lastTsunamiCheck = null;

	const handlers = {
		nied_start: [],
		nied_continue: [],
		nhk: [],
		tsunami: [],
	};

	function alert(type, data, scope, test = false) {
		handlers[type].forEach((h) => {
			h(data, scope, test);
		});
	}

	setInterval(() => {
		NHK(
			() => { lastNHKCheck = Date.now(); },
			(data) => { alert('nhk', data, null); }
		);
	}, 5000);

	setInterval(() => {
		NIED(
			() => { lastNIEDCheck = Date.now(); },
			(data) => { alert('nied_start', data, null); },
			(data) => { alert('nied_continue', data, null); }
		);
	}, 1000);

	setInterval(() => {
		Tsunami(
			() => { lastTsunamiCheck = Date.now(); },
			(data) => { alert('tsunami', data, null); }
		);
	}, 10000);

	// publics
	return {
		allowedTypes: [ 'nied_start', 'nied_continue', 'nhk', 'tsunami' ],
		on: function(type, handler) {
			handlers[type].push(handler);
		},
		pings: function() {
			return {
				nhk: lastNHKCheck,
				nied: lastNIEDCheck,
				tsunami: lastTsunamiCheck,
			};
		},
		test: function(type, scope, shindo) {
			if (!TestData[type]) {
				return;
			}
			alert(type, TestData[type](shindo), scope, true);
		},
		displayRun: function(scope) {
			setTimeout(() => { alert('nied_start', { magnitude: '6.1', max_shindo: '5弱', depth: '10km', epicenter: '山形県庄内地方' }, scope, true); }, 3000);
			setTimeout(() => { alert('nied_continue', { update_num: '5', magnitude: { old: '6.1', new: '6.9' }, max_shindo: { old: '5弱', new: '5強' }, depth: { old: '10km', new: '10km' }, epicenter: { old: '山形県庄内地方', new: '山形県沖' } }, scope, true); }, 8000);
			setTimeout(() => { alert('nied_continue', { update_num: '13', magnitude: { old: '6.9', new: '6.9' }, max_shindo: { old: '5強', new: '6強' }, depth: { old: '10km', new: '10km' }, epicenter: { old: '山形県沖', new: '山形県庄内地方' } }, scope, true); }, 17000);
			setTimeout(() => { alert('nied_continue', { update_num: '20', magnitude: { old: '7.2', new: '7.3' }, max_shindo: { old: '6強', new: '6強' }, depth: { old: '10km', new: '10km' }, epicenter: { old: '山形県沖', new: '山形県沖' } }, scope, true); }, 23000);
			setTimeout(() => { alert('tsunami', { image_url: 'https://www3.nhk.or.jp/sokuho/tsunami/data/TU00zk20190618222404.jpg' }, scope, true); }, 34000);
			setTimeout(() => {
				alert('nhk', { magnitude: '7.1', max_shindo: '6+', depth: '10km', epicenter: '山形県沖', time: 'TEST', image_url: 'https://www3.nhk.or.jp/sokuho/jishin/data/JS00cwA0190618222224_20190618222517.jpg',
					groups: [{
						shindo: '6+',
						areas: [ '新潟下越地方' ],
					}, {
						shindo: '6-',
						areas: [ '山形庄内地方' ],
					}, {
						shindo: '5-',
						areas: [ '秋田沿岸南部', '山形最上地方', '新潟中越地方' ],
					}, {
						shindo: '4',
						areas: [ '岩手内陸北部', '宮城北部', '宮城南部', '宮城中部', '秋田沿岸北部', '秋田内陸北部', '秋田内陸南部', '山形村山地方', '山形置賜地方', '福島中通り', '福島浜通り', '会津', '佐渡地方' ],
					}, {
						shindo: '3',
						areas: [ '津軽北部', '津軽南部', '岩手沿岸北部', '岩手内陸南部', '茨城北部', '栃木北部', '群馬北部', '群馬南部', '埼玉北部', '新潟上越地方', '能登地方', '長野北部' ],
					}] }, scope, true);
			}, 50000);
		},
	};
})();

const TestData = {
	nied_start: (shindo) => {
		return {
			magnitude: '9.8',
			max_shindo: shindo,
			depth: '10km',
			epicenter: '不明',
		};
	},
	nied_continue: (shindo) => {
		return {
			update_num: '3',
			magnitude: { old: '9.8', new: '11.4' },
			max_shindo: { old: '1', new: shindo },
			depth: { old: '10km', new: '20km' },
			epicenter: { old: '不明', new: '新潟下越地方' },
		};
	},
	nhk: (shindo) => {
		return {
			magnitude: '9.4',
			max_shindo: shindo,
			depth: '10km',
			epicenter: '新潟下越地方',
			time: 'TEST',
			image_url: 'https://www3.nhk.or.jp/sokuho/jishin/data/JS00cwA0190618222224_20190618222517.jpg',
			groups: [{
				shindo: '7',
				areas: [ '新潟下越地方' ],
			}, {
				shindo: '6+',
				areas: [ '山形庄内地方' ],
			}, {
				shindo: '6-',
				areas: [ '秋田沿岸南部', '山形最上地方', '新潟中越地方' ],
			}],
		};
	},
	tsunami: () => {
		return {
			image_url: 'https://www3.nhk.or.jp/sokuho/tsunami/data/TU00zk20190618222404.jpg',
		};
	},
};

/*
 * NHK alerts. Tend to be slower, but have nice maps, so they can be useful.
 *
 * Callback will get: {
 *     magnitude,
 *     max_shindo,
 *     depth,
 *     epicenter,
 *     time,
 *     image_url,
 *     groups: [{
 *		   shindo,
 *         areas: []
 *	   }]
 * }
 */
let seenAJishin = false;
const seenJishin = [];
function NHK(success, alertCallback) {
	request('https://www3.nhk.or.jp/sokuho/jishin/data/JishinReport.xml', function(error, response, body) {
		if (error) {
			console.error(error);
			return;
		}

		parseString(body, function(err, result) {
			const jishinUrl = result.jishinReport.record[0].item[0].$.url;

			request({
				url: jishinUrl,
				encoding: null,
			}, function(error, response, body) {
				if (error) {
					console.error(error);
					return;
				}

				body = encoding.convert(body, 'utf8', 'Shift_JIS');

				parseString(body, function(err, result) {
					const newJishin = result.Root.Earthquake[0].Detail[0];

					success();

					if (seenJishin.includes(newJishin) || seenAJishin === false) {
						seenJishin.push(newJishin);
						seenAJishin = true;
						return;
					}
					seenJishin.push(newJishin);
					seenAJishin = true;

					const affectedAreas = [];

					result.Root.Earthquake[0].Relative[0].Group.forEach((group) => {
						const currentArea = {
							shindo: group.$.Intensity,
							areas: [],
						};

						group.Area.forEach((area) => {
							currentArea.areas.push(area.$.Name);
						});

						affectedAreas.push(currentArea);
					});

					alertCallback({
						magnitude: result.Root.Earthquake[0].$.Magnitude,
						max_shindo: result.Root.Earthquake[0].$.Intensity,
						depth: result.Root.Earthquake[0].$.Depth,
						epicenter: result.Root.Earthquake[0].$.Epicenter,
						time: result.Root.Earthquake[0].$.Time,
						image_url: `https://www3.nhk.or.jp/sokuho/jishin/${result.Root.Earthquake[0].Detail[0]}`,
						groups: affectedAreas,
					});
				});
			});
		});
	});
}

/*
 * NIED alerts. Instant, but spammy.
 *
 * alertCallback will get: {
 *	   magnitude,
 *     max_shindo,
 *     depth,
 *     epicenter
 * }
 *
 * continueCallback will get: {
 *     update_num,
 *	   magnitude: { old, new },
 *     max_shindo: { old, new },
 *     depth: { old, new },
 *     epicenter: { old, new }
 * }
 */
let lastLive = null;
let lastLiveNum = 0;
let lastShindo = 0;
let lastMag = 0;
let lastDep = null;
let lastReg = null;
function NIED(success, alertCallback, continueCallback) {
	request(`http://www.kmoni.bosai.go.jp/webservice/hypo/eew/${GetJPTime()}.json`, function(error, response, body) {
		if (error) {
			console.log(error);
			return;
		}

		const jishin = JSON.parse(body);
		if (jishin.result.status !== 'success') {
			console.log(jishin);
			return;
		}

		success();

		if (jishin.report_id === '') {
			// No earthquake
			lastShindo = 0;
			lastMag = 0;
			lastDep = null;
			lastReg = null;
			return;
		}

		if (jishin.report_id === lastLive && jishin.report_num === lastLiveNum) {
			// No update since last report
			return;
		}
		if (jishin.report_id === lastLive) {
			// Update since last report!!
			lastLiveNum = jishin.report_num;

			if (lastShindo !== jishin.calcintensity ||
				lastMag !== jishin.magunitude ||
				lastDep !== jishin.depth ||
				lastReg !== jishin.region_name) {

				continueCallback({
					update_num: jishin.report_num,
					magnitude: { old: lastMag, new: jishin.magunitude },
					max_shindo: { old: lastShindo, new: jishin.calcintensity },
					depth: { old: lastDep, new: jishin.depth },
					epicenter: { old: lastReg, new: jishin.region_name },
				});
			}


			lastShindo = jishin.calcintensity;
			lastMag = jishin.magunitude;
			lastDep = jishin.depth;
			lastReg = jishin.region_name;
			return;
		}
		lastLive = jishin.report_id;
		lastLiveNum = jishin.report_num;
		lastShindo = jishin.calcintensity;
		lastMag = jishin.magunitude;
		lastDep = jishin.depth;
		lastReg = jishin.region_name;
		// Completely new report!!!

		alertCallback({
			magnitude: jishin.magunitude,
			max_shindo: jishin.calcintensity,
			depth: jishin.depth,
			epicenter: jishin.region_name,
		});
	});
}

/*
 * NHK tsunami alerts. I haven't been able to see the XML for an ongoing warning yet, so for now treat all images that aren't the usual as a warning.
 *
 * Callback will get: {
 *     image_url
 * }
 */
let lastTsunami = null;
function Tsunami(success, alertCallback) {
	request({
		url: 'https://www3.nhk.or.jp/sokuho/tsunami/data/publish.xml',
		encoding: null,
	}, function(error, response, body) {
		if (error) {
			console.log(error);
			return;
		}

		body = encoding.convert(body, 'utf8', 'Shift_JIS');

		parseString(body, function(err, result) {
			const newTsunami = result.Root.Latest[0];

			success();

			if ((newTsunami === lastTsunami) || newTsunami == '00000000000000' || newTsunami == '99999999999999') {
				lastTsunami = newTsunami;
				return;
			}
			lastTsunami = newTsunami;

			alertCallback({
				image_url: `https://www3.nhk.or.jp/sokuho/tsunami/data/TU00zk${newTsunami}.jpg`,
			});
		});
	});
}

function GetJPTime() {
	const d = new Date();
	const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
	const nd = new Date(utc + (3600000 * 9));

	return nd.getFullYear()
		+ (nd.getMonth() + 1).toString().padStart(2, '0')
		+ (nd.getDate()).toString().padStart(2, '0')
		+ (nd.getHours()).toString().padStart(2, '0')
		+ (nd.getMinutes()).toString().padStart(2, '0')
		+ (nd.getSeconds()).toString().padStart(2, '0');
}

module.exports = Monitor;
