const CONFIG = require('./config.json');
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');

const Yukari = function(text, success, minimumDelay) {
	const hash = crypto.createHash('md5').update(text).digest('hex');
	const tempPath = `${CONFIG.yukariTempPath}ytmp${hash}.ogg`;
	const cachePath = `${CONFIG.yukariCache}${hash}.ogg`;

	if (fs.existsSync(cachePath)) {
		setTimeout(() => {
			success(cachePath);
		}, minimumDelay);
		return;
	}

	const startTime = Date.now();

	// request the file to be generated
	request.post(
		'https://cloud.ai-j.jp/demo/aitalk2webapi_nop.php',
		{ form: {
			speaker_id: 1206,
			text,
			ext: 'ogg',
			volume: 2.0,
			speed: 1.4,
			pitch: 1.1,
			callback: 'callback',
		} },
		(error, response, body) => {
			if (!error && response.statusCode == 200) {
				const stringjson = body.slice(9, -1); // chop off the jQuery callback stuff... I'm sure there's a better way to do this, but it's OK for now
				let json;
				try {
					json = JSON.parse(stringjson);
				}
				catch (e) {
					return;
				}

				// obtain the file
				request('https:' + json.url)
					.pipe(fs.createWriteStream(tempPath))
					.on('finish', () => {
						// detect the first silence in the file
						execute(`ffmpeg -i "${tempPath}" -af silencedetect=d=0.2 -f null -`, (stdout) => {
							const silence = /silence_end:\s([0-9]+\.[0-9]+)/.exec(stdout);

							if (!silence) {
								return;
							}

							// chop off up to the first silence
							execute(`ffmpeg -ss ${silence[1]} -i "${tempPath}" -af "volume=5dB" -y "${tempPath}"`, () => {
								execute(`ffmpeg -i "assets/yukari/start.ogg" -i "${tempPath}" -i "assets/yukari/end.ogg" -filter_complex "[0:a:0][1:a:0][2:a:0]concat=n=3:v=0:a=1[outa]" -map "[outa]" -y "${tempPath}"`, () => {
									fs.createReadStream(`${tempPath}`).pipe(fs.createWriteStream(cachePath));

									setTimeout(() => {
										fs.unlink(tempPath, ()=>{});
										success(cachePath);
									}, Math.max(0, minimumDelay - (Date.now() - startTime)));
								});
							});
						});
					});
			}
		}
	);
};

const exec = require('child_process').exec;
function execute(command, callback) {
	exec(command, {}, function(error, stdout, stderr) { callback(stderr); });
}

module.exports = Yukari;