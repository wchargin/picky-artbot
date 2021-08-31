const util = require("util");
const fs = require("fs");

const chokidar = require("chokidar");

const artblocks = require("./artblocks");

const KEY_SALES_CHANNEL = "salesChannel";
const KEY_LISTINGS_CHANNEL = "listingsChannel";

async function loadFile(path) {
  const buf = await util.promisify(fs.readFile)(path);
  return JSON.parse(buf.toString());
}

class Config {
  constructor(config) {
    this._config = config;
  }

  static async watchingFile(path) {
    const config = new Config({});
    const modCount = [0];
    async function reload({ hardFail }) {
      const lastModCount = modCount[0];
      let data;
      if (hardFail) {
        data = await loadFile(path);
      } else {
        try {
          data = await loadFile(path);
        } catch (e) {
          console.error(`failed to reload ${path}: ${e}`);
          return;
        }
      }
      console.error(`loaded config from ${path}`);
      if (lastModCount !== modCount[0]++) return;
      config._config = data;
    }
    chokidar
      .watch(path, { persistent: false })
      .on("all", () => reload({ hardFail: false }));
    await reload({ hardFail: true });
    return config;
  }

  dryRun() {
    return !!this._config.dryRun;
  }

  isRelevantTokenId(tokenId) {
    if (this._config.watchAllProjects) return true;
    return this._project(tokenId) != null;
  }

  _project(tokenId) {
    const projectId = artblocks.tokenIdToProjectId(tokenId);
    return this._config.projects.find((p) => p.id === projectId);
  }

  salesChannel(tokenId) {
    return this._discordChannel(KEY_SALES_CHANNEL, tokenId);
  }

  listingsChannel(tokenId) {
    return this._discordChannel(KEY_LISTINGS_CHANNEL, tokenId);
  }

  _discordChannel(channelKey, tokenId) {
    const project = this._project(tokenId);
    const projectSpecificChannel = ((project || {}).discord || {})[channelKey];
    if (projectSpecificChannel != null) {
      return projectSpecificChannel;
    }
    return (this._config.discord || {})[channelKey] || null;
  }

  collectionSlugs() {
    return artblocks.COLLECTION_SLUGS;
  }
}

module.exports = { Config };
