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

  isRelevant(asset) {
    if (isArtblocks(asset) && this._config.watchAllArtblocks) {
      return true;
    }
    return this._project(asset) != null;
  }

  _project(asset) {
    if (isArtblocks(asset)) {
      const projectId = artblocks.tokenIdToProjectId(asset.token_id);
      const artblocksProject = this._config.projects.find(
        (p) => p.artblocksProject === projectId
      );
      if (artblocksProject != null) return artblocksProject;
    }
    const collectionSlug = (asset.collection || {}).slug;
    if (collectionSlug == null) return null;
    return this._config.projects.find(
      (p) => p.collectionSlug === collectionSlug
    );
  }

  salesChannel(asset) {
    return this._discordChannel(KEY_SALES_CHANNEL, asset);
  }

  listingsChannel(asset) {
    return this._discordChannel(KEY_LISTINGS_CHANNEL, asset);
  }

  _discordChannel(channelKey, asset) {
    const project = this._project(asset);
    const projectSpecificChannel = ((project || {}).discord || {})[channelKey];
    if (projectSpecificChannel != null) {
      return projectSpecificChannel;
    }
    return (this._config.discord || {})[channelKey] || null;
  }

  collectionSlugs() {
    const slugs = new Set();
    function addArtblocksSlugs() {
      for (const slug of artblocks.COLLECTION_SLUGS) {
        slugs.add(slug);
      }
    }
    if (this._config.watchAllArtblocks) {
      addArtblocksSlugs();
    }
    for (const project of this._config.projects) {
      if (project.collectionSlug) {
        slugs.add(project.collectionSlug);
      }
      if (project.artblocksProject) {
        addArtblocksSlugs();
      }
    }
    return Array.from(slugs);
  }
}

function isArtblocks(asset) {
  return (
    asset.collection != null &&
    artblocks.COLLECTION_SLUGS.includes(asset.collection.slug)
  );
}

module.exports = { Config };
