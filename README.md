# picky-artbot

Follows OpenSea listings and sales for specific Art Blocks projects, streaming
them to Discord in real time. Live-configurable.

## Usage

First, copy `sample.env` to `.env`, and populate the `DISCORD_TOKEN` line (see
"Configuring Discord" below).

To build:

```
node --version  # should be at least 16.6.0, for `discord.js`
sudo apt-get install moreutils  # for `ts(1)`
npm install
```

To run:

```
npm start -s >log
# in another terminal: `tail -f log` to view output
```

You can change `config.json` while the bot is running, and it'll reload on the
fly. Check the log to make sure that the new configuration loads successfully.

## Configuring Discord

Go to the Discord developer portal and create a new application:
<https://discord.com/developers/applications>

Under the application settings, click "Bot", and enable the bot user. Reveal
the bot's API token and record it in your `.env` file.

Then, go to the OAuth2 settings. Under the list of OAuth2 scopes, select "Bot".
Then, scroll down and set the bot permissions to include "Send Messages",
"Embed Links", and "Read Message History". Copy the resulting OAuth link (looks
like `https://discord.com/api/oauth2/authorize?...`) and open it in a new tab,
then authorize the bot to join your server.

Next, create channels in your Discord server for the listings and sales feeds.
You can set specific channels for specific projects, and you can also have
top-level fallback channels for projects without such overrides. To learn the
ID of a Discord channel, make sure that you have developer mode enabled
(Discord settings, "Advanced", "Developer Mode"), then right-click the channel
name and "Copy ID". Channel IDs should be entered into `config.json` as JSON
strings containing only numbers; consult the sample config for examples.

## Debugging

For debugging purposes, it can be useful to add `"dryRun": true` and
`"watchAllProjects": true` to `config.json`. Setting `watchAllProjects` skips
the token ID filtering, so all Art Blocks tokens are considered relevant.
Setting `dryRun` causes the bot to not actually send messages to Discord, but
still print messages to the console.
