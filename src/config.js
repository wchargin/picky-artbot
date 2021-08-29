const artblocks = require("./artblocks");

class Config {
  constructor(config) {
    this._config = config;
  }

  isRelevantTokenId(tokenId) {
    const projectId = artblocks.tokenIdToProjectId(tokenId);
    return this._config.projects.some((p) => p.id === projectId);
  }
}

module.exports = { Config };
