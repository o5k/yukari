![Banner](https://kagari.moe/outer_assets/yukari/banner.png)
[![CodeFactor](https://www.codefactor.io/repository/github/o5k/yukari/badge)](https://www.codefactor.io/repository/github/o5k/yukari) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/o5k/yukari/blob/master/LICENSE.md)
# Yukari _(結月ゆかり)_
### Earthquake and Tsunami warnings for Discord - Discordに緊急地震速報と津波警報
A simple yet powerful bot that sends Japanese Early Earthquake Warnings, NHK earthquake reports and tsunami alerts straight to Discord with clear, beautiful graphics, and clear text-to-speech alerts powered by the [Yuzuki Yukari vocaloid](https://en.wikipedia.org/wiki/Yuzuki_Yukari). Written in node.js for the first Discord Hack Week.

### [Demonstration Video](https://kagari.moe/outer_assets/yukari/example.mp4)

---

[![Instructions for Server Owners](https://kagari.moe/outer_assets/yukari/server.png)](#Instructions-for-Server-Owners)
[![Instructions for Developers](https://kagari.moe/outer_assets/yukari/devs.png)](#Instructions-for-Developers)
[![Additional information for Users](https://kagari.moe/outer_assets/yukari/users.png)](#Additional-information-for-Users)

> **Seeking Japanese translators!!!** I've added simple Japanese to the bot's alerts, but these are probably "insufficient", to say the least. If you speak Japanese, please consider contributing! 
---

# Instructions for Server Owners
To add Yukari to your server, just invite her. Yukari will immediately begin alerting using text and audio on earthquakes with a seismic intensity of Shindo 3 or higher.

### Configuration
Of course, you might want to change this behaviour. Users with the `Administrator` permission may edit Yukari's config easily using the command `%y config`. A configuration applies server-wide.

To **retrieve** the current configuration:
```
%y config
```
To **update** the configuration:
```
%y config <key> <value>
```
where `<key>` is the configuration item you want to change, and `<value>` the value you wish to set it to.

Here are the configuration keys:

|Key|Description|Type|
|--|--|--|
|`use_nhk`|Whether to receive NHK earthquake reports. They are usually late, but give detailed maps and information on the finished earthquake.|boolean|
|`use_nied`|Whether to receive NIED real-time warnings. These are the heart of the Japanese earthquake system, as they are instant. Especially in the case of large earthquakes, these may be relatively spammy, but the speed of them pays off.|boolean|
|`use_tsunami`|Whether to receive tsunami warnings. Due to insufficient knowledge on how the API for these functions, a tsunami alert only shows the map of the tsunami, no wave heights. They are semi-instant.|boolean|
|`min_shindo`|The minimum seismic intensity required to show alerts. If you don't want to hear about the countless shindo-1 earthquakes, set it to something high, but if you're an enthusiast, you may set this to `1` to receive all alerts.|string (`1`, `2`, `3`, `4`, `5-`, `5+`, `6-`, `6+` or `7`)|
|`ignore_unknown`|Whether to ignore earthquakes of yet-to-be-known intensity. Generally, only very intense earthquakes get reported before knowing their intensity, so it may be worth it to keep this set to `false`. (`min_shindo` does not impact alerts with an unknown intensity.)|boolean|
|`use_text`|Whether to send alerts as text. Turn this off to not receive _any_ text alerts anywhere in your server.|boolean|
|`alert_room`|The channel ID to send text alerts to. Set this to `auto` to let Yukari decide (usually the room that join messages appear in).|a channel ID or `auto`|
|`use_voice`|Whether to send alerts as voice messages. Turn this off to not receive _any_ voice alerts anywhere in your server.|boolean|
|`alert_voice`|The channel ID to send voice alerts to. Set this to `auto` to let Yukari decide (usually the room that the most users are in). Yukari won't join voice channels nobody is in.|a channel ID or `auto`|
|`admin_only`|Do not allow anybody to use any bot commands. If set to `false`, users may still use the `nied` and `ping` commands.|boolean|
|`mention`|Who to mention in text alerts. Set to `nobody` to not mention anyone, to `everyone` to mention @everyone, or to a role ID to mention that role.|a role ID, `everyone` or `nobody`|

# Instructions for Developers
### Requirements
* node.js
* graphicsmagick
* ffmpeg
* A web server (for example, `nginx`)
* A bot token for Discord
* An accurate system time (the NIED alerts require a synchronized system clock)
* Some dependencies require additional packages installed. While testing on a fresh DigitalOcean droplet I had to install these:
  * libtool (required by sodium) (`apt install libtool`)
  * sqlite3 (required by sequelize) (`npm install sqlite3`)
    * node-pre-gyp (required by sqlite3) (`apt install node-pre-gyp`)
  * Depending on your setup, you might need to install node-opus manually (`npm install node-opus`), else voice will not work.

### Setup
Clone the repo and type `npm install` to install the embedded dependencies.
Now set up the `config.json`:

|Key|Description|
|--|--|
|`botmasters`|An array of user IDs of people who have full access over the bot.|
|`token`|Your bot token.|
|`prefix`|The prefix Yukari uses for commands.|
|`niedImageTempPath`|The folder (with `/`) that Yukari saves temporary images in while composing NIED maps.|
|`niedImageLocalPath`|The folder (with `/`) that Yukari saves the final versions of NIED maps in. Files placed in this folder should become available to the public using your webserver.|
|`niedImagePublicPath`|The URL (with `/`) that the final versions of NIED maps can be accessed by the public with|
|`emojiMap`|The emoji used to display different seismic intensities (replace them with plain text if you don't wish to use emoji)|
|`messageIcons`|The URLs of three icons used for rich messages. (`low` is used by NHK alerts, `medium` by NIED alerts, and `high` by tsunami alerts)|
|`yukariCache`|The folder (with `/`) that Yukari saves TTS voice samples in, to not regenerate the TTS every time.|
|`yukariTempPath`|The folder (with `/`) that Yukari saves unfinished TTS voice samples in, while generating them.|
|`presence`|The presence to display with the bot (like "watching for earthquakes").|

### Webserver setup
For NIED imagery and message icons to display properly, you must set up a webserver to display this content. Your webserver must serve the NIED imagery in `niedImageLocalPath` at the URL given by `niedImagePublicPath`.
For example, if your webserver serves everything in `/var/www/html/`, you can set `niedImageLocalPath` to `/var/www/html/yukari/nied/`, and `niedImagePublicPath` to `https://example.com/yukari/nied/`. Ensure Yukari has permissions to place files in the local path.

Furthermore, you must place the message icons in `/assets/icons/` on your webserver as well. For the above example, a good place could be `/var/www/html/yukari/icons/`. Then, just set the paths in `messageIcons` to their URLs (e.g., for `low`: `https://example.com/yukari/icons/alert.png`).

### Emoji setup
If you wish to display seismic intensity as emoji, you must create or have a server that Yukari can be in, that has those emoji. The default emoji are in `/assets/emoji/`. Add those to your Discord server as emoji, then populate the config's `emojiMap` with the emoji IDs and names of the emoji.
If you do not wish to use emoji, you can also set textual representations (for example: `"1": "Shindo One"`).

### Starting the bot
Now that you're all set up, you can start the bot with `node .`. It's recommended to use `forever`, to ensure the bot is always ready to alert you. Your bot will become available with the invite `https://discordapp.com/api/oauth2/authorize?client_id= YOUR CLIENT ID &scope=bot&permissions=53923136`.

You can check whether the bot is working with the command `%y ping` (it should tell you that the three endpoints have been checked a few milliseconds ago), and `%y nied` (it should show a neat map of current seismic activity). The first time, it may take a while for Yukari TTS to play longer samples. As the bot gets used, its cache will develop.

# Additional information for Users
### Reliability and Liability
This bot is meant as a helpful tool. There are **no warranties associated with this tool**. That means: if the bot doesn't work and a 10m tsunami hits your house, or you flee because the bot erroneously tells you a 10m tsunami is coming, the bot is not responsible. Official sources ALWAYS take precedence over Yukari. When in doubt, check those.

### Full commands listing
```
%y config
```
**server admin only** Retrieve the current config.
```
%y config <key> <value>
```
**server admin only** Update the config by setting the key `key` to the value `value`.
```
%y nied
```
Show the current map of seismic activity from NIED.
```
%y ping
```
Show when data was last received.
```
%y stats
```
Show Yukari stats (commit, guild count, event count, etc.).
```
%y test <local|global> <type> [shindo]
```
**server admin only** Play a test alert. The `global` option is only available to the botmasters. Type may be `nhk`, `nied_start`, `nied_continue`, `tsunami` or `displayrun`. The optional argument `shindo` sets the seismic intensity the test will display as (only applicable to `nhk`, `nied_start` and `nied_continue`).
The type `displayrun` plays all types in order, to simulate a real earthquake happening, with a following tsunami alert.
```
%y broadcast <local|global> <message...>
```
**server admin only** Play a broadcast message. The `global` option is only available to the botmasters.

# About
This bot was made by `osk` for the first Discord Hack Week. Data is received from the NHK and NIED, from these sources:

* NHK: https://www.nhk.or.jp/kishou-saigai/earthquake/
* NIED: http://www.kmoni.bosai.go.jp/
* Tsunami: https://www.nhk.or.jp/kishou-saigai/tsunami/

The TTS and avatar are the vocaloid [Yuzuki Yukari](https://en.wikipedia.org/wiki/Yuzuki_Yukari), inspired by [this YouTube channel which monitors earthquakes](https://www.youtube.com/channel/UCmw7DsSCQzRcRG6-SHE_ksg). Filing issues is greatly appreciated!
