require("dotenv").config();
const path = require("path");

const discord = require("discord.js");

const artblocks = require("./artblocks");
const { Config } = require("./config");
const opensea = require("./opensea");

/**
 * Creates a Discord bot client and authenticates with the token specified in
 * the environment. Returns a promise that resolves to that bot once it's ready
 * to start working, or rejects on failure.
 */
async function createBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error("missing Discord token (see README)");
  }
  const bot = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS] });
  const p = new Promise((res) => {
    bot.on("ready", () => {
      console.error(`bot ready as identity ${bot.user.tag}`);
      res(bot);
    });
  });
  await bot.login(token);
  return p;
}

/**
 * Handles an OpenSea event for an NFT, such as a listing, sale, or bid, by
 * checking whether we care about the event and posting to Discord if so.
 *
 * Args: `config` should be a `Config` instance; `bot` should be a Discord
 * `Client` instance; `event` should be an OpenSea object, as passed to the
 * callback for `opensea.streamEvents`.
 */
function reportEvent(config, bot, event) {
  if (!config.isRelevant(event.asset)) return;
  switch (event.event_type) {
    case "created":
      handleListingEvent(config, bot, event);
      break;
    case "successful":
      handleSaleEvent(config, bot, event);
      break;
  }
}

/**
 * Creates a `discord.MessageEmbed` for the given OpenSea `event.asset`.
 */
function assetEmbed(asset) {
  asset = asset || {};
  const embed = new discord.MessageEmbed();
  const image =
    asset.image_url ||
    asset.image_preview_url ||
    asset.image_thumbnail_url ||
    asset.image_original_url;
  if (image) {
    embed.setImage(image);
  }
  const links = [
    {
      name: "OpenSea",
      href: asset.permalink,
    },
    {
      name: "Full image",
      href: asset.image_original_url || asset.image_url,
    },
    {
      name: "Live script",
      href: asset.animation_url || asset.animation_original_url,
    },
  ];
  const linkList = links
    .filter((link) => link.href)
    .map((link) => `[${link.name}](${link.href})`)
    .join(" \u00b7 ");
  const description = `**Links:** ${linkList}`;
  embed.setDescription(description);
  return embed;
}

function handleListingEvent(config, bot, e) {
  const { asset } = e;
  const content = `${asset.name} listed for ${formatWei(e.ending_price)} <${
    asset.permalink
  }>`;
  sendMessage(config, bot, config.listingsChannel(asset), {
    content,
    embeds: [assetEmbed(asset)],
  });
}

function handleSaleEvent(config, bot, e) {
  const { asset } = e;
  const content = `${asset.name} sold for ${formatWei(e.total_price)} <${
    asset.permalink
  }>`;
  sendMessage(config, bot, config.salesChannel(asset), {
    content,
    embeds: [assetEmbed(asset)],
  });
}

/**
 * Sends a message to a Discord channel and also logs it to the console. If
 * `channelId` is `null`, the message is still logged but not sent to Discord.
 */
function sendMessage(config, bot, channelId, msg) {
  console.log(`[->${channelId}]`, msg);
  if (config.dryRun()) return;
  if (!channelId) return;
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
  opensea.streamEvents({
    config,
    pollMs: 5000,
    lookbackMs: 60000,
    handleEvent: (e) => reportEvent(config, bot, e),
  });
}

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "Continuing through unhandled promise rejection at:",
    promise,
    "; reason:",
    reason
  );
});

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
