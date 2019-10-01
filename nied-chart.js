const CONFIG = require('./config.json');
const fs = require('fs');
const crypto = require('crypto');
const request = require('request');
const gm = require('gm');

const CreateChart = function(success, failure) {
	let tryCount = 0;
	const retryClosure = (err) => {
		if (err === '404' && tryCount++ < 10) {
			tryGetGraph(GetJPTime(0 - tryCount), success, retryClosure);
		}
		else {
			failure(err);
		}
	};

	tryGetGraph(GetJPTime(0), success, retryClosure);
};

function tryGetGraph(jptime, success, failure) {
	const tempPath = `${CONFIG.niedImageTempPath}${jptime}compose.png`;
	const tempPathEst = `${CONFIG.niedImageTempPath}${jptime}composewEST.png`;
	const tempPathEst2 = `${CONFIG.niedImageTempPath}${jptime}composewEST2.png`;
	const tempPathNoEst = `${CONFIG.niedImageTempPath}${jptime}composewNOEST.png`;
	const wildPath = `${CONFIG.niedImageTempPath}${jptime}composew*.png`;
	const finalPath = `${CONFIG.niedImageLocalPath}${jptime}.gif`;
	const publicPath = `${CONFIG.niedImagePublicPath}${jptime}.gif`;

	if (fs.existsSync(finalPath)) {
		success(publicPath);
		return;
	}

	downloadImage(`http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/acmap_s/${jptime.substring(0, 8)}/${jptime}.acmap_s.gif`, (pga) => {
		downloadImage(`http://www.kmoni.bosai.go.jp/data/map_img/PSWaveImg/eew/${jptime.substring(0, 8)}/${jptime}.eew.gif`, (pswave) => {
			downloadImage(`http://www.kmoni.bosai.go.jp/data/map_img/EstShindoImg/eew/${jptime.substring(0, 8)}/${jptime}.eew.gif`, (estshindo) => {
				composeTotal(pga, pswave, estshindo, tempPath, tempPathEst, tempPathEst2, tempPathNoEst, wildPath, finalPath, () => {
					fs.unlink(pga, ()=>{});
					if (pswave !== 'assets/blank.gif') {
						fs.unlink(pswave, ()=>{});
					}
					if (estshindo !== 'assets/blank.gif') {
						fs.unlink(estshindo, ()=>{});
					}
					fs.unlink(tempPath, ()=>{});
					fs.unlink(tempPathEst, ()=>{});
					fs.unlink(tempPathEst2, ()=>{});
					fs.unlink(tempPathNoEst, ()=>{});
					success(publicPath);
				}, (err) => {
					failure(err);
				});
			}, (err) => {
				failure(err);
			});
		}, (err) => {
			failure(err);
		});
	}, (err) => {
		failure(err);
	});
}

function composeNoEst(pga, pswave, tempPath, outputPath, success, failure) {
	gm('assets/niedbg.png')
		.composite(pga)
		.write(tempPath, function(err) {
			if (err) {
				failure(err);
			}
			else {
				gm(tempPath)
					.composite(pswave)
					.write(outputPath, function(err) {
						if (err) {
							failure(err);
						}
						else {
							success();
						}
					});
			}
		});
}

function composeEst(pga, pswave, estshindo, tempPath, outputPath, outputPath2, success, failure) {
	gm('assets/niedbg.png')
		.composite(pga)
		.write(tempPath, function(err) {
			if (err) {
				failure(err);
			}
			else {
				gm(tempPath)
					.composite(estshindo)
					.write(tempPath, function(err) {
						if (err) {
							failure(err);
						}
						else {
							gm(tempPath)
								.composite(pswave)
								.write(outputPath, function(err) {
									if (err) {
										failure(err);
									}
									else {
										fs.copyFileSync(outputPath, outputPath2);
										success();
									}
								});
						}
					});
			}
		});
}

function composeFinalGIF(wildPath, outputPath, success, failure) {
	gm(wildPath)
		.delay(30)
		.write(outputPath, function(err) {
			if (err) {
				failure(err);
			}
			else {
				success();
			}
		});
}

function composeTotal(pga, pswave, estshindo, tempPath, tempPathEst, tempPathEst2, tempPathNoEst, wildPath, outputPath, success, failure) {
	composeEst(pga, pswave, estshindo, tempPath, tempPathEst, tempPathEst2, () => {
		composeNoEst(pga, pswave, tempPath, tempPathNoEst, () => {
			composeFinalGIF(wildPath, outputPath, () => {
				success();
			}, (err) => {
				failure(err);
			});
		}, (err) => {
			failure(err);
		});
	}, (err) => {
		failure(err);
	});
}

function downloadImage(imagePath, success, failure) {
	const outputPath = `${CONFIG.niedImageTempPath}${crypto.createHash('md5').update(imagePath).digest('hex')}.gif`;

	request(imagePath, { followRedirect: false })
		.on('response', function(response) {
			if (response.statusCode === 404) {
				fs.unlink(outputPath, ()=>{});
				failure('404');
				return;
			}
			if (response.statusCode !== 200) {
				fs.unlink(outputPath, ()=>{});
				success('assets/blank.gif');
				return;
			}

			success(outputPath);
		})
		.on('error', (err) => {
			failure(err);
		})
		.pipe(fs.createWriteStream(outputPath));
}

function GetJPTime(offset) {
	const d = new Date();
	const utc = d.getTime() + (d.getTimezoneOffset() * 60000) + (offset * 1000);
	const nd = new Date(utc + (3600000 * 9));

	return nd.getFullYear()
		+ (nd.getMonth() + 1).toString().padStart(2, '0')
		+ (nd.getDate()).toString().padStart(2, '0')
		+ (nd.getHours()).toString().padStart(2, '0')
		+ (nd.getMinutes()).toString().padStart(2, '0')
		+ (nd.getSeconds()).toString().padStart(2, '0');
}

module.exports = CreateChart;
