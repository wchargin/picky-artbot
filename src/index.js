require("dotenv").config();
const path = require("path");

const discord = require("discord.js");

const artblocks = require("./artblocks");
const { Config } = require("./config");
const opensea = require("./opensea");

const SLUGS = ["art-blocks", "art-blocks-curated", "art-blocks-factory"];

async function createBot() {
  const bot = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS] });
  const p = new Promise((res) => {
    bot.on("ready", () => {
      console.error(`bot ready as identity ${bot.user.tag}`);
      res(bot);
    });
  });
  bot.login(process.env.DISCORD_TOKEN);
  return p;
}

function reportEvent(config, bot, event) {
  if (!config.isRelevantTokenId(event.asset.token_id)) return;
  switch (event.event_type) {
    case "created":
      handleListingEvent(config, bot, event);
      break;
    case "successful":
      handleSaleEvent(config, bot, event);
      break;
  }
}

function handleListingEvent(config, bot, e) {
  const description = `${e.asset.name} listed for ${formatWei(e.ending_price)}`;
  const msg = `${description} <${e.asset.permalink}>`;
  sendMessage(config, bot, config.listingsChannel(e.asset.token_id), msg);
}

function handleSaleEvent(config, bot, e) {
  const description = `${e.asset.name} sold for ${formatWei(e.total_price)}`;
  const msg = `${description} <${e.asset.permalink}>`;
  sendMessage(config, bot, config.salesChannel(e.asset.token_id), msg);
}

function sendMessage(config, bot, channelId, msg) {
  console.log(`[->${channelId}]`, msg);
  if (config.dryRun()) return;
  bot.channels.cache.get(channelId).send(msg);
}

function formatWei(wei) {
  let bigwei;
  try {
    bigwei = BigInt(wei);
  } catch (e) {
    return "[?] ETH";
  }
  const eth = Number(bigwei / 10n ** 15n) / 10 ** 3;
  return `${eth.toFixed(3)} ETH`;
}

async function main() {
  const configPath = path.join(__dirname, "..", "config.json");
  const config = await Config.watchingFile(configPath);
  const bot = await createBot();
  for (const slug of SLUGS) {
    opensea.streamEvents({
      source: { slug },
      pollMs: 5000,
      lookbackMs: 60000,
      handleEvent: (e) => reportEvent(config, bot, e),
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
