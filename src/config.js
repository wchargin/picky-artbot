const util = require("util");
const fs = require("fs");

const chokidar = require("chokidar");

const artblocks = require("./artblocks");

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
    const projectId = artblocks.tokenIdToProjectId(tokenId);
    return this._config.projects.some((p) => p.id === projectId);
  }

  salesChannel() {
    return this._config.discord.salesChannel;
  }

  listingsChannel() {
    return this._config.discord.listingsChannel;
  }
}

module.exports = { Config };
